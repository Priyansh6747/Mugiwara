import { getVideoSources, selectSource } from "@/lib/AllAnime.js";

/**
 * GET /api/source?showId=xxx&ep=1&mode=sub&quality=best
 *
 * Full resolution chain:
 *   fetchProviderEntries → decodeProviderId → fetchLinksFromProvider → selectSource
 *
 * Returns: { url, quality, type, referer }
 *   - url      → direct video URL (m3u8 or mp4)
 *   - quality  → e.g. "1080p"
 *   - type     → "m3u8" | "mp4"
 *   - referer  → Referer header the player must send with requests
 *
 * Pass quality=list to get the full sorted source list instead of a single pick.
 */
export async function GET(request) {
  const { searchParams } = request.nextUrl;

  const showId  = searchParams.get("showId");
  const ep      = searchParams.get("ep");
  const mode    = searchParams.get("mode")    ?? "sub";
  const quality = searchParams.get("quality") ?? "best";

  if (!showId || !ep) {
    return Response.json(
      { error: "Missing required params: showId, ep" },
      { status: 400 }
    );
  }

  try {
    const sources = await getVideoSources(showId, ep, mode);

    if (!sources.length) {
      return Response.json({ error: "No sources found" }, { status: 404 });
    }

    // Return the full list so the client can pick / display all options
    if (quality === "list") {
      return Response.json(sources);
    }

    const picked = selectSource(sources, quality);
    return Response.json(picked);
  } catch (err) {
    console.error("[/api/source]", err);
    return Response.json({ error: err.message }, { status: 502 });
  }
}
