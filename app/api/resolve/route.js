import { adminDb } from "@/lib/firebaseAdmin";
import { searchAnime, resolveAllAnimeShowId } from "@/lib/AllAnime";
import { Timestamp } from "firebase-admin/firestore";

/**
 * GET /api/resolve?alid=15125&malId=21&q=One+Piece
 * Resolves an AniList animeId → AllAnime show _id.
 * 1. Checks Firebase AnimeData cache (keyed by anilistId).
 * 2. Title search on AllAnime, disambiguated by malId when present.
 * 3. Falls back to plain title search for alternatives list.
 */
export async function GET(request) {
  const { searchParams } = request.nextUrl;
  const anilistId = searchParams.get("alid");
  const malId = searchParams.get("malId");
  const q = searchParams.get("q")?.trim();
  const mode = searchParams.get("mode") ?? "sub";

  if (!q) {
    return Response.json({ error: "Missing query param ?q=" }, { status: 400 });
  }

  try {
    if (anilistId) {
      try {
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
      } catch (cacheErr) {
        console.warn("[/api/resolve] cache lookup skipped:", cacheErr.message);
      }
    }

    const allanimeId = await resolveAllAnimeShowId({
      title: q,
      malId: malId ? Number(malId) : null,
      mode,
    });

    if (allanimeId) {
      if (anilistId) {
        try {
          await adminDb.collection("AnimeData").doc(allanimeId).set({
            animeId: allanimeId,
            anilistId: Number(anilistId),
            malId: malId ? Number(malId) : null,
            title: q,
            cachedAt: Timestamp.now(),
            alternatives: [],
          }, { merge: true });
        } catch (cacheErr) {
          console.warn("[/api/resolve] cache write skipped:", cacheErr.message);
        }
      }
      return Response.json({ id: allanimeId, alternatives: [] });
    }

    // Last resort — plain title search (returns alternatives too)
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
