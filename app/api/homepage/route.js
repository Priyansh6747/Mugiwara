import { getHomepageData } from "@/lib/AllAnime.js";

/**
 * GET /api/homepage
 * Returns { trending, popular, topRated, seasonal, airing, currentSeason }
 * All 5 AniList lists fetched in parallel via getHomepageData().
 */
export async function GET() {
  try {
    const data = await getHomepageData({ perPage: 20 });
    return Response.json(data);
  } catch (err) {
    console.error("[/api/homepage]", err);
    return Response.json({ error: err.message }, { status: 502 });
  }
}
