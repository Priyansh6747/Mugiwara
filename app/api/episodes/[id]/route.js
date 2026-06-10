import { getEpisodeList } from "@/lib/AllAnime.js";

/**
 * GET /api/episodes/[id]?mode=sub
 * Returns sorted episode list for a given show ID.
 * e.g. ["1", "2", ... "1100"]
 */
export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("mode") ?? "sub";

  if (!id) {
    return Response.json({ error: "Missing show id" }, { status: 400 });
  }

  try {
    const episodes = await getEpisodeList(id, mode);
    return Response.json(episodes);
  } catch (err) {
    console.error(`[/api/episodes/${id}]`, err);
    return Response.json({ error: err.message }, { status: 502 });
  }
}
