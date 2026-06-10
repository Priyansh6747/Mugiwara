/**
 * Usage:
 *   const { searchAnime, getEpisodeList, getVideoSources, getSkipTimes } = require('./allanime');
 */

const crypto = require("crypto");

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLANIME_REFERER = "https://youtu-chan.com";
const ALLANIME_BASE    = "allanime.day";
const ALLANIME_API     = `https://api.${ALLANIME_BASE}`;
const ANISKIP_API      = "https://api.aniskip.com/v1/skip-times";

const AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0";

// AES-256-CTR key: SHA-256 of the hardcoded string (same as ani-cli's openssl call)
const ALLANIME_KEY = crypto
    .createHash("sha256")
    .update("Xot36i3lK3:v1")
    .digest();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function headers(extra = {}) {
    return {
        "User-Agent":   AGENT,
        "Content-Type": "application/json",
        "Referer":      ALLANIME_REFERER,
        "Origin":       ALLANIME_REFERER,
        ...extra,
    };
}

async function gqlPost(body) {
    const res = await fetch(`${ALLANIME_API}/api`, {
        method:  "POST",
        headers: headers(),
        body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`AllAnime API error: ${res.status}`);
    return res.json();
}

// ─── Decryption ───────────────────────────────────────────────────────────────
// Mirrors ani-cli's process_response() → openssl enc -d -aes-256-ctr

function decryptResponse(raw) {
    if (!raw.includes('"tobeparsed"')) return raw;

    const match = raw.match(/"tobeparsed":"([^"]*)"/);
    if (!match) return raw;

    // base64-decode the payload
    const buf = Buffer.from(match[1], "base64");

    // Layout (from ani-cli's dd commands):
    //   byte 0         → ignored
    //   bytes 1..12    → 12-byte IV
    //   bytes 13..N-17 → ciphertext
    //   bytes N-16..N  → (padding/auth tag area, unused for CTR)
    const iv     = buf.slice(1, 13);
    const ctLen  = buf.length - 13 - 16;
    const ct     = buf.slice(13, 13 + ctLen);

    // ani-cli sets the CTR counter to 2 (appends 00000002 as big-endian uint32)
    const ctrIv = Buffer.alloc(16);
    iv.copy(ctrIv, 0);       // first 12 bytes = IV
    ctrIv.writeUInt32BE(2, 12); // last 4 bytes = counter starting at 2

    const decipher = crypto.createDecipheriv("aes-256-ctr", ALLANIME_KEY, ctrIv);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

// ─── Provider ID Decoder ──────────────────────────────────────────────────────
// Mirrors ani-cli's giant sed substitution chain for "--"-prefixed provider IDs

const HEX_MAP = {
    "79":"A","7a":"B","7b":"C","7c":"D","7d":"E","7e":"F","7f":"G","70":"H",
    "71":"I","72":"J","73":"K","74":"L","75":"M","76":"N","77":"O","68":"P",
    "69":"Q","6a":"R","6b":"S","6c":"T","6d":"U","6e":"V","6f":"W","60":"X",
    "61":"Y","62":"Z","59":"a","5a":"b","5b":"c","5c":"d","5d":"e","5e":"f",
    "5f":"g","50":"h","51":"i","52":"j","53":"k","54":"l","55":"m","56":"n",
    "57":"o","48":"p","49":"q","4a":"r","4b":"s","4c":"t","4d":"u","4e":"v",
    "4f":"w","40":"x","41":"y","42":"z","08":"0","09":"1","0a":"2","0b":"3",
    "0c":"4","0d":"5","0e":"6","0f":"7","00":"8","01":"9","15":"-","16":".",
    "67":"_","46":"~","02":":","17":"/","07":"?","1b":"#","63":"[","65":"]",
    "78":"@","19":"!","1c":"$","1e":"&","10":"(","11":")","12":"*","13":"+",
    "14":",","03":";","05":"=","1d":"%",
};

function decodeProviderId(raw) {
    if (!raw.startsWith("--")) return raw;

    const hex    = raw.slice(2); // strip leading "--"
    const chunks = hex.match(/.{2}/g) ?? [];
    const decoded = chunks.map(ch => HEX_MAP[ch] ?? "").join("");

    // ani-cli replaces /clock with /clock.json in the decoded URL
    return decoded.replace("/clock", "/clock.json");
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Search AllAnime for an anime by title.
 *
 * @param {string} query
 * @param {"sub"|"dub"} [mode="sub"]
 * @returns {Promise<Array<{id: string, title: string, episodeCount: number}>>}
 */
async function searchAnime(query, mode = "sub") {
    const gql = `query($search:SearchInput $limit:Int $page:Int $translationType:VaildTranslationTypeEnumType $countryOrigin:VaildCountryOriginEnumType){shows(search:$search limit:$limit page:$page translationType:$translationType countryOrigin:$countryOrigin){edges{_id name availableEpisodes __typename}}}`;

    const data = await gqlPost({
        query: gql,
        variables: {
            search: { allowAdult: false, allowUnknown: false, query },
            limit: 40,
            page:  1,
            translationType: mode,
            countryOrigin:   "ALL",
        },
    });

    return (data?.data?.shows?.edges ?? [])
        .filter(e => (e.availableEpisodes?.[mode] ?? 0) > 0)
        .map(e => ({
            id:           e._id,
            title:        e.name,
            episodeCount: e.availableEpisodes?.[mode] ?? 0,
        }));
}

// ─── Episode List ─────────────────────────────────────────────────────────────

/**
 * Get sorted episode list for a show.
 *
 * @param {string} showId
 * @param {"sub"|"dub"} [mode="sub"]
 * @returns {Promise<string[]>}  e.g. ["1","2","3",..."1122"]
 */
async function getEpisodeList(showId, mode = "sub") {
    const gql = `query($showId:String!){show(_id:$showId){_id availableEpisodesDetail}}`;

    const data = await gqlPost({ query: gql, variables: { showId } });
    const eps  = data?.data?.show?.availableEpisodesDetail?.[mode] ?? [];

    return [...eps].sort((a, b) => parseFloat(a) - parseFloat(b));
}

// ─── Source Resolution ────────────────────────────────────────────────────────

/**
 * Fetch raw provider entries (sourceName + encoded sourceUrl) for an episode.
 * Tries persisted-query GET first (faster), falls back to full GQL POST.
 *
 * @returns {Promise<Array<{sourceName: string, sourceUrl: string}>>}
 */
async function fetchProviderEntries(showId, epNo, mode) {
    const gql = `query($showId:String!,$translationType:VaildTranslationTypeEnumType!,$episodeString:String!){episode(showId:$showId translationType:$translationType episodeString:$episodeString){episodeString sourceUrls}}`;

    const queryHash = "d405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec";
    const variables = JSON.stringify({ showId, translationType: mode, episodeString: epNo });
    const extensions = JSON.stringify({ persistedQuery: { version: 1, sha256Hash: queryHash } });

    const params = new URLSearchParams({ variables, extensions });

    // Try GET with persisted query
    let rawText = "";
    try {
        const res = await fetch(`${ALLANIME_API}/api?${params}`, {
            headers: headers({ "Content-Type": "application/x-www-form-urlencoded" }),
        });
        rawText = await res.text();
    } catch { /* fall through */ }

    // Fall back to POST if GET didn't return sourceUrls
    if (!rawText.includes("sourceUrls") && !rawText.includes("tobeparsed")) {
        const res = await fetch(`${ALLANIME_API}/api`, {
            method:  "POST",
            headers: headers(),
            body:    JSON.stringify({ query: gql, variables: { showId, translationType: mode, episodeString: epNo } }),
        });
        rawText = await res.text();
    }

    const decrypted = decryptResponse(rawText);

    // Parse out all {sourceUrl, sourceName} pairs
    const entries = [];
    // After decryption the JSON is flat enough for a simple regex sweep
    const re = /"sourceUrl"\s*:\s*"([^"]*)"\s*[^}]*?"sourceName"\s*:\s*"([^"]*)"/g;
    let m;
    while ((m = re.exec(decrypted)) !== null) {
        entries.push({
            sourceUrl:  m[1].replace(/\\u002F/g, "/").replace(/\\/g, ""),
            sourceName: m[2],
        });
    }

    return entries;
}

/**
 * Given a resolved provider path, fetch direct video link(s).
 * Mirrors ani-cli's get_links() logic for each provider type.
 *
 * @param {string} providerPath  Decoded provider URL/path
 * @returns {Promise<Array<{quality: string, url: string, type: "m3u8"|"mp4"}>>}
 */
async function fetchLinksFromProvider(providerPath) {
    const results = [];

    // ── mp4upload ──────────────────────────────────────────────────────────────
    if (providerPath.includes("mp4upload")) {
        const res  = await fetch(providerPath, { headers: { "User-Agent": AGENT, "Referer": ALLANIME_REFERER } });
        const html = await res.text();
        const m    = html.match(/src:\s*"([^"]+)"/);
        if (m) results.push({ quality: "mp4upload", url: m[1], type: "mp4" });
        return results;
    }

    // ── AllAnime CDN endpoint ──────────────────────────────────────────────────
    const cdnUrl = `https://${ALLANIME_BASE}${providerPath}`;
    const res    = await fetch(cdnUrl, { headers: headers() });
    const text   = await res.text();

    // Pattern 1: explicit resolution + link pairs
    // e.g. "resolutionStr":"1080p" ... "link":"https://..."
    const linkRe = /"resolutionStr"\s*:\s*"([^"]*)"\s*[^}]*?"link"\s*:\s*"([^"]*)"/g;
    let m;
    while ((m = linkRe.exec(text)) !== null) {
        const url = m[2].replace(/\\\//g, "/");
        results.push({ quality: m[1], url, type: url.includes(".m3u8") ? "m3u8" : "mp4" });
    }

    if (results.length > 0) return results;

    // Pattern 2: wixmp repackager  e.g. .../,720p,480p,/mp4/master.m3u8.urlset/...
    // ani-cli extracts each resolution from the comma-separated list in the URL
    const wixRe = /repackager\.wixmp\.com\/([^,]+),([^/]+),\/mp4/;
    const wixM  = text.match(wixRe);
    if (wixM) {
        const baseUrl    = wixM[1];
        const resolutions = wixM[2].split(",").filter(Boolean);
        for (const r of resolutions) {
            // Reconstruct per-resolution URL
            const url = text
                .match(/"link"\s*:\s*"([^"]*)"/)?.[1]
                ?.replace(/\\\//g, "/")
                ?.replace(/,([^/]+),/, `,${r},`);
            if (url) results.push({ quality: r, url, type: "mp4" });
        }
        if (results.length > 0) return results;
    }

    // Pattern 3: master.m3u8 — fetch the playlist and extract resolution variants
    if (text.includes("master.m3u8")) {
        const hlsM = text.match(/"url"\s*:\s*"([^"]*master\.m3u8[^"]*)"/);
        if (hlsM) {
            const masterUrl  = hlsM[1].replace(/\\\//g, "/");
            // Grab the Referer that allanime wants us to use for this HLS stream
            const refM       = text.match(/"Referer"\s*:\s*"([^"]*)"/i);
            const hlsReferer = refM ? refM[1] : ALLANIME_REFERER;

            const masterRes  = await fetch(masterUrl, {
                headers: { "User-Agent": AGENT, "Referer": hlsReferer },
            });
            const masterText = await masterRes.text();

            if (masterText.includes("#EXTM3U")) {
                const baseUrl   = masterUrl.replace(/[^/]*$/, "");
                const lines     = masterText.split("\n");

                for (let i = 0; i < lines.length; i++) {
                    if (!lines[i].startsWith("#EXT-X-STREAM-INF")) continue;
                    if (lines[i].includes("EXT-X-I-FRAME")) continue; // skip I-frame playlists

                    const resM     = lines[i].match(/RESOLUTION=\d+x(\d+)/);
                    const quality  = resM ? `${resM[1]}p` : "auto";
                    const nextLine = lines[i + 1]?.trim();
                    if (!nextLine || nextLine.startsWith("#")) continue;

                    const streamUrl = nextLine.startsWith("http") ? nextLine : `${baseUrl}${nextLine}`;
                    results.push({ quality, url: streamUrl, type: "m3u8", referer: hlsReferer });
                }
            } else {
                // Single HLS stream, no variants
                results.push({ quality: "auto", url: masterUrl, type: "m3u8", referer: hlsReferer });
            }
        }
    }

    return results;
}

/**
 * Resolve all available video sources for an episode.
 * Fires all 4 providers in parallel (mirrors ani-cli's background jobs).
 *
 * @param {string} showId
 * @param {string} epNo       e.g. "1", "1.5", "42"
 * @param {"sub"|"dub"} [mode="sub"]
 * @returns {Promise<Array<{quality: string, url: string, type: "m3u8"|"mp4", referer: string}>>}
 *          Sorted best→worst by numeric resolution
 */
async function getVideoSources(showId, epNo, mode = "sub") {
    const entries = await fetchProviderEntries(showId, epNo, mode);
    if (!entries.length) throw new Error("No provider entries found for this episode.");

    // Decode all provider IDs and fetch links in parallel (providers 1–4)
    const jobs = entries.slice(0, 4).map(async entry => {
        try {
            const decoded = decodeProviderId(entry.sourceUrl);
            if (!decoded || decoded.length < 5) return [];
            return await fetchLinksFromProvider(decoded);
        } catch (err) {
            // One provider failing shouldn't kill the rest
            console.warn(`[provider] ${entry.sourceName} failed:`, err.message);
            return [];
        }
    });

    const settled = await Promise.allSettled(jobs);
    const all = settled
        .filter(r => r.status === "fulfilled")
        .flatMap(r => r.value)
        .map(s => ({ referer: ALLANIME_REFERER, ...s })); // default referer

    // Deduplicate by URL
    const seen = new Set();
    const unique = all.filter(s => {
        if (seen.has(s.url)) return false;
        seen.add(s.url);
        return true;
    });

    // Sort: numeric resolution descending, non-numeric last
    return unique.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
}

/**
 * Pick a source from the list by quality preference.
 *
 * @param {ReturnType<typeof getVideoSources> extends Promise<infer T> ? T : never} sources
 * @param {"best"|"worst"|"1080p"|"720p"|"480p"|"360p"|string} [quality="best"]
 * @returns The best matching source object
 */
function selectSource(sources, quality = "best") {
    if (!sources.length) throw new Error("No sources available");
    if (quality === "best")  return sources[0];
    if (quality === "worst") return sources[sources.length - 1];

    const exact   = sources.find(s => s.quality === quality);
    if (exact) return exact;

    const qNum    = parseInt(quality);
    const numeric = sources.find(s => parseInt(s.quality) === qNum);
    if (numeric) return numeric;

    console.warn(`Quality "${quality}" not found, falling back to best`);
    return sources[0];
}

// ─── AniSkip — intro/outro timestamps ────────────────────────────────────────

/**
 * Fetch intro/outro skip times from AniSkip (https://aniskip.com).
 * Uses the MAL ID + episode number, same as ani-skip script.
 *
 * @param {number|string} malId    MyAnimeList ID (NOT the AllAnime ID)
 * @param {number|string} episode  Episode number
 * @returns {Promise<{
 *   op:  {startTime: number, endTime: number}|null,
 *   ed:  {startTime: number, endTime: number}|null,
 *   found: boolean
 * }>}
 */
async function getSkipTimes(malId, episode) {
    const url = `${ANISKIP_API}/${malId}/${episode}?types=op&types=ed`;

    const res = await fetch(url, {
        headers:  { "User-Agent": AGENT },
        signal:   AbortSignal.timeout(5000), // 5s timeout — ani-skip uses --connect-timeout 5
    });

    if (!res.ok) return { found: false, op: null, ed: null };

    const data = await res.json();
    if (!data.found) return { found: false, op: null, ed: null };

    const items = data.results ?? [];

    function extract(type) {
        const item = items.find(i => i.skip_type === type);
        if (!item) return null;
        return {
            startTime: item.interval.start_time,
            endTime:   item.interval.end_time,
        };
    }

    return {
        found: true,
        op:    extract("op"), // opening
        ed:    extract("ed"), // ending
    };
}

/**
 * Resolve an AllAnime show ID → MAL ID.
 * Needed because AniSkip uses MAL IDs, but we have AllAnime IDs from search.
 *
 * @param {string} allanimeId
 * @returns {Promise<string|null>}
 */
async function getMalId(allanimeId) {
    const res = await fetch(`${ALLANIME_API}/api`, {
        method:  "POST",
        headers: headers(),
        body:    JSON.stringify({
            query: `{ show(_id: "${allanimeId}") { malId } }`,
        }),
    });
    const data = await res.json();
    return data?.data?.show?.malId ?? null;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    searchAnime,
    getEpisodeList,
    getVideoSources,
    selectSource,
    getSkipTimes,
    getMalId,
    // Exposed for testing / advanced use
    _internal: {
        decryptResponse,
        decodeProviderId,
        fetchProviderEntries,
        fetchLinksFromProvider,
    },
};