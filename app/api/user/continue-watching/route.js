/**
 * app/api/user/continue-watching/route.js
 *
 * GET    — list continue-watching entries for the current user
 * POST   — upsert a continue-watching entry (called from the video player)
 * DELETE — remove a specific entry  (body: { animeId, episode })
 */

import { NextResponse }                                   from "next/server";
import { requireSession }                                 from "@/lib/auth";
import { getUserData, upsertContinueWatching, removeContinueWatching, addToHistory } from "@/lib/firestore";

export async function GET(req) {
  try {
    const { uid } = await requireSession(req);
    const data    = await getUserData(uid);
    return NextResponse.json({ continueWatching: data?.continueWatching ?? [] });
  } catch (res) {
    if (res instanceof Response) return res;
    console.error("[continue-watching GET]", res);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { uid } = await requireSession(req);
    const body    = await req.json();
    const {
      animeId, anilistId, title, coverImage,
      episode, episodeId, timestamp, duration,
    } = body;

    if (!animeId || episode == null || timestamp == null) {
      return NextResponse.json(
        { error: "animeId, episode, and timestamp are required" },
        { status: 400 }
      );
    }

    await upsertContinueWatching(uid, {
      animeId, anilistId, title, coverImage,
      episode, episodeId, timestamp, duration,
    });

    // If >= 90% through, mark as watched in history
    if (duration && timestamp / duration >= 0.9) {
      await addToHistory(uid, { animeId, anilistId, title, coverImage, episode });
    }

    return NextResponse.json({ saved: true });
  } catch (res) {
    if (res instanceof Response) return res;
    console.error("[continue-watching POST]", res);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { uid } = await requireSession(req);
    const { animeId, episode } = await req.json();

    if (!animeId || episode == null) {
      return NextResponse.json({ error: "animeId and episode are required" }, { status: 400 });
    }

    await removeContinueWatching(uid, animeId, episode);
    return NextResponse.json({ removed: true });
  } catch (res) {
    if (res instanceof Response) return res;
    console.error("[continue-watching DELETE]", res);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
