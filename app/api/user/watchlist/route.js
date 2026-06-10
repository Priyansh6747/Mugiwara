/**
 * app/api/user/watchlist/route.js
 *
 * GET    — fetch the current user's watchlist
 * POST   — add an anime to watchlist
 * DELETE — remove an anime from watchlist  (body: { animeId })
 */

import { NextResponse }                    from "next/server";
import { requireSession }                  from "@/lib/auth";
import { getUserData, addToWatchlist, removeFromWatchlist, toggleWatchlist } from "@/lib/firestore";

export async function GET(req) {
  try {
    const { uid } = await requireSession(req);
    const data    = await getUserData(uid);
    return NextResponse.json({ watchlist: data?.watchlist ?? [] });
  } catch (res) {
    if (res instanceof Response) return res;
    console.error("[watchlist GET]", res);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { uid }  = await requireSession(req);
    const body     = await req.json();
    const { animeId, anilistId, title, coverImage } = body;

    if (!animeId || !title) {
      return NextResponse.json({ error: "animeId and title are required" }, { status: 400 });
    }

    const result = await addToWatchlist(uid, { animeId, anilistId, title, coverImage });
    return NextResponse.json(result);
  } catch (res) {
    if (res instanceof Response) return res;
    console.error("[watchlist POST]", res);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { uid } = await requireSession(req);
    const { animeId } = await req.json();

    if (!animeId) {
      return NextResponse.json({ error: "animeId is required" }, { status: 400 });
    }

    await removeFromWatchlist(uid, animeId);
    return NextResponse.json({ removed: true });
  } catch (res) {
    if (res instanceof Response) return res;
    console.error("[watchlist DELETE]", res);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PATCH — toggle (convenience endpoint)
export async function PATCH(req) {
  try {
    const { uid }  = await requireSession(req);
    const body     = await req.json();

    if (!body.animeId || !body.title) {
      return NextResponse.json({ error: "animeId and title are required" }, { status: 400 });
    }

    const result = await toggleWatchlist(uid, body);
    return NextResponse.json(result);
  } catch (res) {
    if (res instanceof Response) return res;
    console.error("[watchlist PATCH]", res);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
