/**
 * app/api/user/history/route.js
 *
 * GET    — get watch history for the current user
 * DELETE — clear entire watch history  (body: {} or omit for full clear)
 *          body: { animeId, episode }  — remove a single entry
 */

import { NextResponse }           from "next/server";
import { requireSession }         from "@/lib/auth";
import { getUserData, addToHistory } from "@/lib/firestore";
import { adminDb }                from "@/lib/firebaseAdmin";

export async function GET(req) {
  try {
    const { uid } = await requireSession(req);
    const data    = await getUserData(uid);
    return NextResponse.json({ watchHistory: data?.watchHistory ?? [] });
  } catch (res) {
    if (res instanceof Response) return res;
    console.error("[history GET]", res);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { uid } = await requireSession(req);
    const body    = await req.json();
    const { animeId, anilistId, title, coverImage, episode } = body;

    if (!animeId || episode == null) {
      return NextResponse.json(
        { error: "animeId and episode are required" },
        { status: 400 }
      );
    }

    await addToHistory(uid, { animeId, anilistId, title, coverImage, episode });
    return NextResponse.json({ added: true });
  } catch (res) {
    if (res instanceof Response) return res;
    console.error("[history POST]", res);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { uid } = await requireSession(req);
    let body = {};
    try { body = await req.json(); } catch { /* empty body is fine */ }

    const ref = adminDb.collection("UserData").doc(uid);

    if (body.animeId && body.episode != null) {
      // Remove single entry
      const snap = await ref.get();
      if (snap.exists) {
        const updated = (snap.data().watchHistory ?? []).filter(
          (e) => !(e.animeId === body.animeId && e.episode === body.episode)
        );
        await ref.set({ watchHistory: updated }, { merge: true });
      }
      return NextResponse.json({ removed: "entry" });
    }

    // Clear all history
    await ref.set({ watchHistory: [] }, { merge: true });
    return NextResponse.json({ removed: "all" });
  } catch (res) {
    if (res instanceof Response) return res;
    console.error("[history DELETE]", res);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
