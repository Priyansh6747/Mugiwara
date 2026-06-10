/**
 * Diagnostic: run with   node lib/diag.js <showId> <ep>
 * Prints decoded provider URLs and the actual fetch error for each one.
 *
 * Example:
 *   node lib/diag.js kibfyvtiFpKCGGoSD 1
 */

const crypto = require("crypto");

const ALLANIME_REFERER = "https://youtu-chan.com";
const ALLANIME_BASE    = "allanime.day";
const ALLANIME_API     = `https://api.${ALLANIME_BASE}`;
const AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0";

const ALLANIME_KEY = crypto.createHash("sha256").update("Xot36i3lK3:v1").digest();

function hdrs(extra = {}) {
  return { "User-Agent": AGENT, "Content-Type": "application/json",
           "Referer": ALLANIME_REFERER, "Origin": ALLANIME_REFERER, ...extra };
}

function decryptResponse(raw) {
  if (!raw.includes('"tobeparsed"')) return raw;
  const match = raw.match(/"tobeparsed":"([^"]*)"/);
  if (!match) return raw;
  const buf   = Buffer.from(match[1], "base64");
  const iv    = buf.slice(1, 13);
  const ctLen = buf.length - 13 - 16;
  const ct    = buf.slice(13, 13 + ctLen);
  const ctrIv = Buffer.alloc(16);
  iv.copy(ctrIv, 0);
  ctrIv.writeUInt32BE(2, 12);
  const d = crypto.createDecipheriv("aes-256-ctr", ALLANIME_KEY, ctrIv);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}

const HEX_MAP = {"79":"A","7a":"B","7b":"C","7c":"D","7d":"E","7e":"F","7f":"G","70":"H","71":"I","72":"J","73":"K","74":"L","75":"M","76":"N","77":"O","68":"P","69":"Q","6a":"R","6b":"S","6c":"T","6d":"U","6e":"V","6f":"W","60":"X","61":"Y","62":"Z","59":"a","5a":"b","5b":"c","5c":"d","5d":"e","5e":"f","5f":"g","50":"h","51":"i","52":"j","53":"k","54":"l","55":"m","56":"n","57":"o","48":"p","49":"q","4a":"r","4b":"s","4c":"t","4d":"u","4e":"v","4f":"w","40":"x","41":"y","42":"z","08":"0","09":"1","0a":"2","0b":"3","0c":"4","0d":"5","0e":"6","0f":"7","00":"8","01":"9","15":"-","16":".","67":"_","46":"~","02":":","17":"/","07":"?","1b":"#","63":"[","65":"]","78":"@","19":"!","1c":"$","1e":"&","10":"(","11":")","12":"*","13":"+","14":",","03":";","05":"=","1d":"%"};

function decodeProviderId(raw) {
  if (!raw.startsWith("--")) return raw;
  const chunks = raw.slice(2).match(/.{2}/g) ?? [];
  return chunks.map(c => HEX_MAP[c] ?? "").join("").replace("/clock", "/clock.json");
}

async function main() {
  const showId = process.argv[2];
  const epNo   = process.argv[3] ?? "1";
  const mode   = process.argv[4] ?? "sub";

  if (!showId) {
    console.error("Usage: node lib/diag.js <showId> [ep] [mode]");
    process.exit(1);
  }

  // ── Step 1: fetch provider entries ────────────────────────────────────────
  console.log(`\n=== fetchProviderEntries(${showId}, ${epNo}, ${mode}) ===`);

  const gql = `query($showId:String!,$translationType:VaildTranslationTypeEnumType!,$episodeString:String!){episode(showId:$showId translationType:$translationType episodeString:$episodeString){episodeString sourceUrls}}`;
  const queryHash  = "d405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec";
  const variables  = JSON.stringify({ showId, translationType: mode, episodeString: epNo });
  const extensions = JSON.stringify({ persistedQuery: { version: 1, sha256Hash: queryHash } });
  const params     = new URLSearchParams({ variables, extensions });

  let rawText = "";
  try {
    const r = await fetch(`${ALLANIME_API}/api?${params}`, {
      headers: hdrs({ "Content-Type": "application/x-www-form-urlencoded" }),
    });
    rawText = await r.text();
    console.log("GET status:", r.status);
  } catch(e) {
    console.error("GET failed:", e.message, e.cause);
  }

  if (!rawText.includes("sourceUrls") && !rawText.includes("tobeparsed")) {
    console.log("Falling back to POST…");
    try {
      const r = await fetch(`${ALLANIME_API}/api`, {
        method: "POST", headers: hdrs(),
        body: JSON.stringify({ query: gql, variables: { showId, translationType: mode, episodeString: epNo } }),
      });
      rawText = await r.text();
      console.log("POST status:", r.status);
    } catch(e) {
      console.error("POST failed:", e.message, e.cause);
    }
  }

  const decrypted = decryptResponse(rawText);
  const re = /"sourceUrl"\s*:\s*"([^"]*)"\s*[^}]*?"sourceName"\s*:\s*"([^"]*)"/g;
  const entries = [];
  let m;
  while ((m = re.exec(decrypted)) !== null) {
    entries.push({ sourceUrl: m[1].replace(/\\u002F/g, "/").replace(/\\/g, ""), sourceName: m[2] });
  }

  console.log(`\nFound ${entries.length} provider entries:`);
  entries.forEach((e, i) => {
    const decoded = decodeProviderId(e.sourceUrl);
    console.log(`\n  [${i}] sourceName : ${e.sourceName}`);
    console.log(`       raw url    : ${e.sourceUrl.slice(0, 60)}…`);
    console.log(`       decoded    : ${decoded}`);
  });

  if (!entries.length) {
    console.log("\nNo entries — cannot proceed. Raw response snippet:");
    console.log(decrypted.slice(0, 500));
    return;
  }

  // ── Step 2: probe each provider ───────────────────────────────────────────
  console.log("\n=== Provider fetch probes ===");

  for (const entry of entries.slice(0, 6)) {
    const decoded = decodeProviderId(entry.sourceUrl);
    if (!decoded || decoded.length < 5) { console.log(`[${entry.sourceName}] decoded URL too short, skip`); continue; }

    const targetUrl = decoded.includes("mp4upload")
      ? decoded
      : `https://${ALLANIME_BASE}${decoded}`;

    console.log(`\n  Provider : ${entry.sourceName}`);
    console.log(`  Fetching : ${targetUrl}`);

    try {
      const r = await fetch(targetUrl, {
        headers: hdrs(),
        signal: AbortSignal.timeout(8000),
      });
      const body = await r.text();
      console.log(`  Status   : ${r.status}`);
      console.log(`  Body     : ${body.slice(0, 200)}`);
    } catch(e) {
      console.error(`  FAILED   : ${e.message}`);
      if (e.cause) console.error(`  cause    :`, e.cause);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
