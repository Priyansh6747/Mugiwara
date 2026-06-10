/**
 * app/api/user/me/route.js
 *
 * GET — return the current user's full profile data from Firestore
 *       (continueWatching, watchHistory, watchlist).
 *       Returns 401 if not authenticated, 200 with null data if doc doesn't exist yet.
 */

import { NextResponse }   from "next/server";
import { requireSession } from "@/lib/auth";
import { getUserData }    from "@/lib/firestore";

export async function GET(req) {
  try {
    const { uid, email, name, picture } = await requireSession(req);
    const userData = await getUserData(uid);

    return NextResponse.json({
      uid,
      email:      email   ?? null,
      name:       name    ?? null,
      photoURL:   picture ?? null,
      continueWatching: userData?.continueWatching ?? [],
      watchHistory:     userData?.watchHistory     ?? [],
      watchlist:        userData?.watchlist        ?? [],
    });
  } catch (res) {
    if (res instanceof Response) return res;
    console.error("[user/me GET]", res);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
