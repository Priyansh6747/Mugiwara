import { searchAnime } from "@/lib/AllAnime.js";

/**
 * GET /api/search?q=naruto&mode=sub
 * Proxies AllAnime GQL search and returns [{id, title, episodeCount}]
 */
export async function GET(request) {
  const { searchParams } = request.nextUrl;
  const q    = searchParams.get("q")?.trim();
  const mode = searchParams.get("mode") ?? "sub";

  if (!q) {
    return Response.json({ error: "Missing query param ?q=" }, { status: 400 });
  }

  try {
    const results = await searchAnime(q, mode);
    return Response.json(results);
  } catch (err) {
    console.error("[/api/search]", err);
    return Response.json({ error: err.message }, { status: 502 });
  }
}
