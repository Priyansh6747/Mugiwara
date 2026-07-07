/**
 * Usage:
 *   const {
 *     searchAnime, getEpisodeList, getVideoSources, getSkipTimes,
 *     // ── Homepage (AniList) ──
 *     getTrending, getPopular, getSeasonalAnime, getCurrentSeason,
 *     getAnimeDetails, searchAniList,
 *   } = require('./allanime');
 *
 * AniList API (https://graphql.anilist.co) is used for homepage metadata:
 * cover art, genres, scores, trending/seasonal/popular lists.
 * AllAnime is used for actual video stream resolution.
 *
 * The two services are bridged via MAL ID:
 *   AniList  → media.idMal  (MAL ID, used for AniSkip)
 *   AllAnime → getMalId()   (also returns MAL ID)
 * Both services share the same MAL ID space, so you can cross-link them.
 */

const crypto = require("crypto");

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLANIME_REFERER = "https://youtu-chan.com";
const ALLANIME_BASE    = "allanime.day";
const ALLANIME_API     = `https://api.${ALLANIME_BASE}`;
const ANISKIP_API      = "https://api.aniskip.com/v1/skip-times";
const ANILIST_API      = "https://graphql.anilist.co";

const AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0";

// AES-256-GCM key: SHA-256 of reverse("anbbpo") = "oppbna"
// AllAnime rotated from AES-256-CTR ("Xot36i3lK3:v1") to AES-256-GCM ("oppbna") in 2026.
const ALLANIME_KEY = crypto
    .createHash("sha256")
    .update("oppbna")
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
// AllAnime now uses AES-256-GCM (was AES-256-CTR).
// tobeparsed payload layout:
//   bytes  0..11  → 12-byte IV
//   bytes 12..N-17 → ciphertext
//   bytes N-16..N  → 16-byte GCM auth tag

function decryptResponse(raw) {
    if (!raw.includes('"tobeparsed"')) return raw;

    const match = raw.match(/"tobeparsed":"([^"]*)"/);
    if (!match) return raw;

    // base64-decode the payload
    const buf   = Buffer.from(match[1], "base64");

    const iv      = buf.slice(0, 12);                      // first 12 bytes = IV
    const authTag = buf.slice(buf.length - 16);            // last 16 bytes = GCM auth tag
    const ct      = buf.slice(12, buf.length - 16);        // middle = ciphertext

    try {
        const decipher = crypto.createDecipheriv("aes-256-gcm", ALLANIME_KEY, iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
    } catch {
        // GCM auth tag mismatch — fall back to returning raw so callers can still
        // attempt JSON.parse on an unencrypted response.
        return raw;
    }
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

    // ── Strategy 1: proper JSON parse (most reliable) ─────────────────────────
    try {
        const json     = JSON.parse(decrypted);
        const sources  = json?.data?.episode?.sourceUrls ?? [];
        if (sources.length > 0) {
            return sources
                .filter(s => s.sourceUrl && s.sourceName)
                .map(s => ({
                    sourceUrl:  s.sourceUrl.replace(/\\u002F/g, "/").replace(/\\/g, ""),
                    sourceName: s.sourceName,
                }));
        }
    } catch { /* not plain JSON — fall through to regex */ }

    // ── Strategy 2: regex sweep — handles both field orders ───────────────────
    // Extract all sourceUrl values and all sourceName values independently,
    // then zip them by position (same order AllAnime always uses in the array).
    const urlRe  = /\"sourceUrl\"\s*:\s*\"((?:[^"\\]|\\.)*)"/g;
    const nameRe = /\"sourceName\"\s*:\s*\"((?:[^"\\]|\\.)*)"/g;

    const urls  = [];
    const names = [];
    let m;
    while ((m = urlRe.exec(decrypted))  !== null) urls.push(m[1]);
    while ((m = nameRe.exec(decrypted)) !== null) names.push(m[1]);

    const entries = [];
    const len = Math.min(urls.length, names.length);
    for (let i = 0; i < len; i++) {
        entries.push({
            sourceUrl:  urls[i].replace(/\\u002F/g, "/").replace(/\\/g, ""),
            sourceName: names[i],
        });
    }

    if (entries.length === 0) {
        // Log enough context to diagnose future API changes without dumping keys
        console.warn("[fetchProviderEntries] no entries found. decrypted snippet:",
            decrypted.slice(0, 400));
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

    // ── External embed pages (already absolute URLs) ───────────────────────────
    // These are browser-session-gated embeds (ok.ru, streamsb, videos.sh, etc.).
    // They cannot be fetched server-side — bail early with a clear error so the
    // caller's catch block logs a meaningful message instead of an ENOTFOUND from
    // a malformed "allanime.dayhttps://..." URL.
    if (providerPath.startsWith("http") && !providerPath.includes("mp4upload")) {
        throw new Error(`external embed (browser-only): ${providerPath}`);
    }

    // ── mp4upload ──────────────────────────────────────────────────────────────
    if (providerPath.includes("mp4upload")) {
        const res  = await fetch(providerPath, {
            headers: { "User-Agent": AGENT, "Referer": ALLANIME_REFERER },
            signal:  AbortSignal.timeout(15_000),
        });
        const html = await res.text();
        const m    = html.match(/src:\s*"([^"]+)"/);
        if (m) results.push({ quality: "mp4upload", url: m[1], type: "mp4" });
        return results;
    }

    // ── AllAnime CDN endpoint (relative /apivtwo/… path) ──────────────────────
    const cdnUrl = `https://${ALLANIME_BASE}${providerPath}`;
    const res    = await fetch(cdnUrl, { headers: headers(), signal: AbortSignal.timeout(15_000) });
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
                signal:  AbortSignal.timeout(15_000),
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

    // Sort so AllAnime CDN providers (--hex encoded → /apivtwo/clock.json) come
    // first, then mp4upload, then external browser-only embeds last.
    // This fixes the case where external embeds fill the first N slots and the
    // working CDN providers would be skipped by an arbitrary slice.
    function providerPriority(url) {
        if (url.startsWith("--"))             return 0; // AllAnime CDN — always try first
        if (url.includes("mp4upload"))        return 1; // sometimes works
        return 2;                                       // external embed — browser-only, will throw
    }
    const sorted = [...entries].sort(
        (a, b) => providerPriority(a.sourceUrl) - providerPriority(b.sourceUrl)
    );

    // Try all providers in parallel — individual failures are caught and logged
    const jobs = sorted.map(async entry => {
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

/**
 * Resolve an AniList homepage item → AllAnime show _id.
 * AllAnime SearchInput only accepts `query` (title), so we search by
 * display title and pick the result whose malId matches when available.
 *
 * @param {object} opts
 * @param {string}  opts.title   Romaji / English title for AllAnime search
 * @param {number|string|null} [opts.malId]  MAL ID to disambiguate results
 * @param {"sub"|"dub"} [opts.mode="sub"]
 * @returns {Promise<string|null>}  AllAnime _id, or null if not found
 */
async function resolveAllAnimeShowId({ title, malId, mode = "sub" }) {
    if (!title) return null;

    const gql = `query($search:SearchInput $limit:Int $page:Int $translationType:VaildTranslationTypeEnumType $countryOrigin:VaildCountryOriginEnumType){shows(search:$search limit:$limit page:$page translationType:$translationType countryOrigin:$countryOrigin){edges{_id name malId availableEpisodes __typename}}}`;

    const data = await gqlPost({
        query: gql,
        variables: {
            search: { allowAdult: false, allowUnknown: false, query: title },
            limit: 40,
            page:  1,
            translationType: mode,
            countryOrigin:   "ALL",
        },
    });

    const edges = (data?.data?.shows?.edges ?? [])
        .filter(e => (e.availableEpisodes?.[mode] ?? 0) > 0);

    if (malId != null) {
        const byMal = edges.find(e => Number(e.malId) === Number(malId));
        if (byMal) return byMal._id;
    }

    return edges[0]?._id ?? null;
}

/** @deprecated Use resolveAllAnimeShowId — kept for callers passing title + malId */
async function getAllAnimeIdFromMal(malId, mode = "sub", title = "") {
    return resolveAllAnimeShowId({ title, malId, mode });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── AniList — Homepage Metadata ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
//
// AniList (https://graphql.anilist.co) provides cover art, scores, genres,
// trending/seasonal/popular lists. No API key required.
//
// Returned anime objects have this shape:
// {
//   animeId:     number,   // AniList media ID — stable key for cards / cache
//   id:          number,   // alias of animeId (AniList ID)
//   malId:       number|null,  // MAL ID — bridge to AllAnime / AniSkip
//   title: {
//     romaji:    string,
//     english:   string|null,
//     native:    string|null,
//   },
//   description: string|null,  // HTML, strip tags if displaying as plain text
//   coverImage: {
//     extraLarge: string,  // URL — largest, use for banners
//     large:      string,  // URL — default card size
//     medium:     string,  // URL — small thumbnails
//     color:      string|null,  // dominant hex color, e.g. "#e46e3c"
//   },
//   bannerImage: string|null,  // wide banner URL (not always present)
//   genres:      string[],     // e.g. ["Action", "Adventure", "Fantasy"]
//   averageScore: number|null, // 0–100
//   popularity:  number,       // total list entries
//   episodes:    number|null,  // null if still airing
//   status:      "FINISHED"|"RELEASING"|"NOT_YET_RELEASED"|"CANCELLED"|"HIATUS",
//   season:      "WINTER"|"SPRING"|"SUMMER"|"FALL"|null,
//   seasonYear:  number|null,
//   format:      "TV"|"TV_SHORT"|"MOVIE"|"SPECIAL"|"OVA"|"ONA"|"MUSIC"|null,
//   nextAiringEpisode: { airingAt: number, episode: number }|null,
// }

const ANILIST_MEDIA_FRAGMENT = `
  fragment MediaFields on Media {
    id
    idMal
    title { romaji english native }
    description(asHtml: false)
    coverImage { extraLarge large medium color }
    bannerImage
    genres
    averageScore
    popularity
    episodes
    status
    season
    seasonYear
    format
    nextAiringEpisode { airingAt episode }
  }
`;

/**
 * Generic AniList GraphQL POST helper.
 * No auth header needed — AniList public API is open.
 *
 * @param {string} query     GQL query string
 * @param {object} variables
 * @returns {Promise<object>}
 */
async function anilistPost(query, variables = {}) {
    const res = await fetch(ANILIST_API, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body:    JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
    const json = await res.json();
    if (json.errors?.length) {
        throw new Error(`AniList GQL error: ${json.errors[0].message}`);
    }
    return json.data;
}

/** Normalise the raw AniList media node to a clean object. */
function normaliseMedia(m) {
    return {
        animeId:      m.id,
        id:           m.id,
        malId:        m.idMal ?? null,
        title: {
            romaji:  m.title?.romaji  ?? null,
            english: m.title?.english ?? null,
            native:  m.title?.native  ?? null,
        },
        // Prefer English title, fall back to romaji
        displayTitle: m.title?.english || m.title?.romaji || m.title?.native || "Unknown",
        description:  m.description ?? null,
        coverImage: {
            extraLarge: m.coverImage?.extraLarge ?? null,
            large:      m.coverImage?.large      ?? null,
            medium:     m.coverImage?.medium     ?? null,
            color:      m.coverImage?.color      ?? null,
        },
        bannerImage:        m.bannerImage              ?? null,
        genres:             m.genres                   ?? [],
        averageScore:       m.averageScore             ?? null,
        popularity:         m.popularity               ?? 0,
        episodes:           m.episodes                 ?? null,
        status:             m.status                   ?? null,
        season:             m.season                   ?? null,
        seasonYear:         m.seasonYear               ?? null,
        format:             m.format                   ?? null,
        nextAiringEpisode:  m.nextAiringEpisode         ?? null,
    };
}

// ─── Season Helper ────────────────────────────────────────────────────────────

/**
 * Returns the current anime season and year.
 * Seasons: WINTER (Jan–Mar), SPRING (Apr–Jun), SUMMER (Jul–Sep), FALL (Oct–Dec)
 *
 * @returns {{ season: string, year: number }}
 */
function getCurrentSeason() {
    const now   = new Date();
    const month = now.getMonth() + 1; // 1–12
    const year  = now.getFullYear();
    let season;
    if      (month <= 3)  season = "WINTER";
    else if (month <= 6)  season = "SPRING";
    else if (month <= 9)  season = "SUMMER";
    else                  season = "FALL";
    return { season, year };
}

// ─── Homepage Queries ─────────────────────────────────────────────────────────

/**
 * Fetch currently trending anime on AniList.
 *
 * @param {object}  [opts]
 * @param {number}  [opts.perPage=20]   1–50
 * @param {number}  [opts.page=1]
 * @returns {Promise<ReturnType<typeof normaliseMedia>[]>}
 */
async function getTrending({ perPage = 20, page = 1 } = {}) {
    const query = `
        ${ANILIST_MEDIA_FRAGMENT}
        query($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
                    ...MediaFields
                }
            }
        }
    `;
    const data = await anilistPost(query, { page, perPage });
    return (data?.Page?.media ?? []).map(normaliseMedia);
}

/**
 * Fetch all-time popular anime on AniList.
 *
 * @param {object}  [opts]
 * @param {number}  [opts.perPage=20]
 * @param {number}  [opts.page=1]
 * @returns {Promise<ReturnType<typeof normaliseMedia>[]>}
 */
async function getPopular({ perPage = 20, page = 1 } = {}) {
    const query = `
        ${ANILIST_MEDIA_FRAGMENT}
        query($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
                    ...MediaFields
                }
            }
        }
    `;
    const data = await anilistPost(query, { page, perPage });
    return (data?.Page?.media ?? []).map(normaliseMedia);
}

/**
 * Fetch top-rated (highest average score) anime on AniList.
 *
 * @param {object}  [opts]
 * @param {number}  [opts.perPage=20]
 * @param {number}  [opts.page=1]
 * @returns {Promise<ReturnType<typeof normaliseMedia>[]>}
 */
async function getTopRated({ perPage = 20, page = 1 } = {}) {
    const query = `
        ${ANILIST_MEDIA_FRAGMENT}
        query($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                media(sort: SCORE_DESC, type: ANIME, isAdult: false, minimumTagRank: 60) {
                    ...MediaFields
                }
            }
        }
    `;
    const data = await anilistPost(query, { page, perPage });
    return (data?.Page?.media ?? []).map(normaliseMedia);
}

/**
 * Fetch anime airing in a given season/year.
 * Defaults to the current season.
 *
 * @param {object} [opts]
 * @param {string} [opts.season]    "WINTER"|"SPRING"|"SUMMER"|"FALL"  (default: current)
 * @param {number} [opts.year]      e.g. 2025  (default: current year)
 * @param {number} [opts.perPage=30]
 * @param {number} [opts.page=1]
 * @param {"POPULARITY_DESC"|"SCORE_DESC"|"TRENDING_DESC"} [opts.sort="POPULARITY_DESC"]
 * @returns {Promise<ReturnType<typeof normaliseMedia>[]>}
 */
async function getSeasonalAnime({ season, year, perPage = 30, page = 1, sort = "POPULARITY_DESC" } = {}) {
    const cur = getCurrentSeason();
    const s   = season ?? cur.season;
    const y   = year   ?? cur.year;

    const query = `
        ${ANILIST_MEDIA_FRAGMENT}
        query($season: MediaSeason, $year: Int, $page: Int, $perPage: Int, $sort: [MediaSort]) {
            Page(page: $page, perPage: $perPage) {
                media(season: $season, seasonYear: $year, type: ANIME, isAdult: false, sort: $sort) {
                    ...MediaFields
                }
            }
        }
    `;
    const data = await anilistPost(query, { season: s, year: y, page, perPage, sort: [sort] });
    return (data?.Page?.media ?? []).map(normaliseMedia);
}

/**
 * Fetch currently airing anime (status: RELEASING), sorted by trending.
 *
 * @param {object}  [opts]
 * @param {number}  [opts.perPage=20]
 * @param {number}  [opts.page=1]
 * @returns {Promise<ReturnType<typeof normaliseMedia>[]>}
 */
async function getCurrentlyAiring({ perPage = 20, page = 1 } = {}) {
    const query = `
        ${ANILIST_MEDIA_FRAGMENT}
        query($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                media(status: RELEASING, type: ANIME, isAdult: false, sort: TRENDING_DESC) {
                    ...MediaFields
                }
            }
        }
    `;
    const data = await anilistPost(query, { page, perPage });
    return (data?.Page?.media ?? []).map(normaliseMedia);
}

/**
 * Fetch full details for a single anime by its AniList ID.
 * Includes recommendations and relations in addition to MediaFields.
 *
 * @param {number} anilistId
 * @returns {Promise<ReturnType<typeof normaliseMedia> & { recommendations: any[], relations: any[] }>}
 */
async function getAnimeDetails(anilistId) {
    const query = `
        ${ANILIST_MEDIA_FRAGMENT}
        query($id: Int) {
            Media(id: $id, type: ANIME) {
                ...MediaFields
                recommendations(perPage: 10) {
                    nodes {
                        mediaRecommendation { ...MediaFields }
                    }
                }
                relations {
                    edges {
                        relationType
                        node { ...MediaFields }
                    }
                }
            }
        }
    `;
    const data = await anilistPost(query, { id: anilistId });
    const m    = data?.Media;
    if (!m) throw new Error(`AniList: no anime found for id ${anilistId}`);

    const base = normaliseMedia(m);

    base.recommendations = (m.recommendations?.nodes ?? [])
        .map(n => n.mediaRecommendation)
        .filter(Boolean)
        .map(normaliseMedia);

    base.relations = (m.relations?.edges ?? [])
        .filter(e => e.node)
        .map(e => ({ relationType: e.relationType, ...normaliseMedia(e.node) }));

    return base;
}

/**
 * Search AniList by title.
 * Complements AllAnime's searchAnime() — use AniList results for metadata/cover
 * art, then pass the title into AllAnime's searchAnime() to get the playable ID.
 *
 * @param {string} query
 * @param {object} [opts]
 * @param {number} [opts.perPage=20]
 * @param {number} [opts.page=1]
 * @returns {Promise<ReturnType<typeof normaliseMedia>[]>}
 */
async function searchAniList(query, { perPage = 20, page = 1 } = {}) {
    const gql = `
        ${ANILIST_MEDIA_FRAGMENT}
        query($search: String, $page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                media(search: $search, type: ANIME, isAdult: false) {
                    ...MediaFields
                }
            }
        }
    `;
    const data = await anilistPost(gql, { search: query, page, perPage });
    return (data?.Page?.media ?? []).map(normaliseMedia);
}

/**
 * Load everything needed for the homepage in a single parallel batch.
 * Returns trending, popular, current-season, and currently-airing lists.
 *
 * @param {object} [opts]
 * @param {number} [opts.perPage=20]  Rows per section
 * @returns {Promise<{
 *   trending:       ReturnType<typeof normaliseMedia>[],
 *   popular:        ReturnType<typeof normaliseMedia>[],
 *   topRated:       ReturnType<typeof normaliseMedia>[],
 *   seasonal:       ReturnType<typeof normaliseMedia>[],
 *   airing:         ReturnType<typeof normaliseMedia>[],
 *   currentSeason:  { season: string, year: number },
 * }>}
 */
async function getHomepageData({ perPage = 20 } = {}) {
    const currentSeason = getCurrentSeason();

    const [trending, popular, topRated, seasonal, airing] = await Promise.all([
        getTrending({ perPage }),
        getPopular({ perPage }),
        getTopRated({ perPage }),
        getSeasonalAnime({ ...currentSeason, perPage }),
        getCurrentlyAiring({ perPage }),
    ]);

    return { trending, popular, topRated, seasonal, airing, currentSeason };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    // ── AllAnime (video playback) ──────────────────────────────────────────────
    searchAnime,
    getEpisodeList,
    getVideoSources,
    selectSource,
    getSkipTimes,
    getMalId,
    resolveAllAnimeShowId,
    getAllAnimeIdFromMal,

    // ── AniList (homepage metadata) ───────────────────────────────────────────
    getTrending,
    getPopular,
    getTopRated,
    getSeasonalAnime,
    getCurrentlyAiring,
    getAnimeDetails,
    searchAniList,
    getHomepageData,
    getCurrentSeason,

    // ── Exposed for testing / advanced use ────────────────────────────────────
    _internal: {
        decryptResponse,
        decodeProviderId,
        fetchProviderEntries,
        fetchLinksFromProvider,
        anilistPost,
        normaliseMedia,
    },
};