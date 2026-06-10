import { adminDb } from "@/lib/firebaseAdmin";
import { searchAnime } from "@/lib/AllAnime";
import { Timestamp } from "firebase-admin/firestore";

/**
 * GET /api/resolve?alid=123&q=Naruto
 * Resolves an anilist ID to an AllAnime ID.
 * 1. Checks Firebase AnimeData cache.
 * 2. If not found, searches AllAnime, picks the top result, caches it and alternatives.
 */
export async function GET(request) {
  const { searchParams } = request.nextUrl;
  const anilistId = searchParams.get("alid");
  const q = searchParams.get("q")?.trim();
  const mode = searchParams.get("mode") ?? "sub";

  if (!q) {
    return Response.json({ error: "Missing query param ?q=" }, { status: 400 });
  }

  try {
    if (anilistId) {
      const snap = await adminDb.collection("AnimeData")
        .where("anilistId", "==", Number(anilistId))
        .limit(1)
        .get();

      if (!snap.empty) {
        const doc = snap.docs[0].data();
        return Response.json({
          id: doc.animeId,
          alternatives: doc.alternatives || []
        });
      }
    }

    // Not found in cache, let's search
    const results = await searchAnime(q, mode);
    if (!results || results.length === 0) {
      return Response.json({ error: "No results found" }, { status: 404 });
    }

    const topOption = results[0];
    const alternatives = results.slice(1);

    // Cache it for future
    if (anilistId) {
      // We use topOption.id as the doc ID since that's what firestore.js uses for AnimeData
      await adminDb.collection("AnimeData").doc(topOption.id).set({
        animeId: topOption.id,
        anilistId: Number(anilistId),
        title: q,
        cachedAt: Timestamp.now(),
        alternatives: alternatives
      }, { merge: true });
    }

    return Response.json({
      id: topOption.id,
      alternatives
    });
  } catch (err) {
    console.error("[/api/resolve]", err);
    return Response.json({ error: err.message }, { status: 502 });
  }
}
