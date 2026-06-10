const crypto = require("crypto");

const AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0";
const DEFAULT_REFERER = "https://youtu-chan.com";
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

function secret() {
    return process.env.STREAM_PROXY_SECRET || "mugiwara-stream-proxy";
}

function sign(payloadB64) {
    return crypto.createHmac("sha256", secret()).update(payloadB64).digest("base64url");
}

/**
 * Opaque token encoding upstream url + referer. Never sent to the client decoded.
 */
function encodeStreamToken({ url, referer }) {
    const payload = Buffer.from(JSON.stringify({
        url,
        referer: referer || DEFAULT_REFERER,
        exp: Date.now() + TOKEN_TTL_MS,
    })).toString("base64url");
    return `${payload}.${sign(payload)}`;
}

function decodeStreamToken(token) {
    if (!token || typeof token !== "string") return null;
    const dot = token.lastIndexOf(".");
    if (dot < 1) return null;

    const payloadB64 = token.slice(0, dot);
    const sig        = token.slice(dot + 1);
    if (sig !== sign(payloadB64)) return null;

    try {
        const data = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
        if (!data?.url || !data.exp || Date.now() > data.exp) return null;
        if (!/^https?:\/\//i.test(data.url)) return null;
        return { url: data.url, referer: data.referer || DEFAULT_REFERER };
    } catch {
        return null;
    }
}

function buildProxyUrl(origin, source) {
    const token = encodeStreamToken({ url: source.url, referer: source.referer });
    return `${origin.replace(/\/$/, "")}/api/stream?t=${encodeURIComponent(token)}`;
}

function resolveAgainst(baseUrl, ref) {
    if (/^https?:\/\//i.test(ref)) return ref;
    const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return new URL(ref, base).href;
}

function rewriteM3u8(text, upstreamUrl, referer, origin) {
    const base = upstreamUrl.includes("/")
        ? upstreamUrl.slice(0, upstreamUrl.lastIndexOf("/") + 1)
        : `${upstreamUrl}/`;

    const proxyFor = (absUrl) => buildProxyUrl(origin, { url: absUrl, referer });

    return text.split("\n").map((line) => {
        let out = line.replace(/URI="([^"]+)"/gi, (_, uri) => {
            const abs = resolveAgainst(base, uri);
            return `URI="${proxyFor(abs)}"`;
        });

        const trimmed = out.trim();
        if (!trimmed || trimmed.startsWith("#")) return out;

        return proxyFor(resolveAgainst(base, trimmed));
    }).join("\n");
}

function corsHeaders(extra = {}) {
    return {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Type",
        "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type",
        ...extra,
    };
}

function isM3u8(contentType, url, bodyPeek) {
    if (contentType?.includes("mpegurl") || contentType?.includes("m3u8")) return true;
    if (url.includes(".m3u8")) return true;
    if (bodyPeek?.trimStart().startsWith("#EXTM3U")) return true;
    return false;
}

/**
 * Proxy a single upstream media request (mp4 segment, m3u8 playlist, etc.).
 */
async function proxyStreamRequest(request, target, origin) {
    const { url, referer } = target;
    const range = request.headers.get("range");

    const upstreamHeaders = {
        "User-Agent": AGENT,
        "Referer":    referer,
        "Origin":     referer,
    };
    if (range) upstreamHeaders.Range = range;

    const upstream = await fetch(url, {
        headers: upstreamHeaders,
        signal:  AbortSignal.timeout(30_000),
        redirect: "follow",
    });

    if (!upstream.ok && upstream.status !== 206) {
        return Response.json(
            { error: `Upstream ${upstream.status}` },
            { status: upstream.status, headers: corsHeaders() }
        );
    }

    const contentType = upstream.headers.get("content-type") || "";

    // Buffer small responses so we can detect m3u8 even with wrong Content-Type
    if (!range && isM3u8(contentType, url)) {
        const text = await upstream.text();
        const rewritten = rewriteM3u8(text, url, referer, origin);
        return new Response(rewritten, {
            status: 200,
            headers: corsHeaders({
                "Content-Type": "application/vnd.apple.mpegurl",
                "Cache-Control": "no-store",
            }),
        });
    }

    const passHeaders = corsHeaders({
        "Content-Type": contentType || "application/octet-stream",
        "Accept-Ranges": upstream.headers.get("accept-ranges") || "bytes",
        "Cache-Control": "no-store",
    });

    const contentRange = upstream.headers.get("content-range");
    const contentLength = upstream.headers.get("content-length");
    if (contentRange) passHeaders["Content-Range"] = contentRange;
    if (contentLength) passHeaders["Content-Length"] = contentLength;

    return new Response(upstream.body, {
        status: upstream.status,
        headers: passHeaders,
    });
}

module.exports = {
    AGENT,
    encodeStreamToken,
    decodeStreamToken,
    buildProxyUrl,
    corsHeaders,
    proxyStreamRequest,
    toClientSources: (sources, origin) =>
        sources.map((s) => ({
            quality: s.quality,
            type:    s.type,
            url:     buildProxyUrl(origin, s),
        })),
};
