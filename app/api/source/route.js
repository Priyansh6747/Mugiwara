import { getVideoSources, selectSource } from "@/lib/AllAnime.js";
import { toClientSources } from "@/lib/streamProxy";

/**
 * GET /api/source?showId=xxx&ep=1&mode=sub&quality=best
 *
 * Resolves providers server-side and returns same-origin proxy URLs only.
 * Client shape: { url, quality, type } — url is always /api/stream?t=…
 */
export async function GET(request) {
  const { searchParams, origin } = request.nextUrl;

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

    const proxied = toClientSources(sources, origin);

    if (quality === "list") {
      return Response.json(proxied);
    }

    const picked = selectSource(sources, quality);
    const client = toClientSources([picked], origin)[0];
    return Response.json(client);
  } catch (err) {
    console.error("[/api/source]", err);
    return Response.json({ error: err.message }, { status: 502 });
  }
}
