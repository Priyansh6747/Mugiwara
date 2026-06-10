/**
 * app/api/auth/session/route.js
 *
 * POST  — exchange a Firebase ID token for a session cookie (login)
 * DELETE — clear the session cookie (logout)
 */

import { NextResponse }          from "next/server";
import { adminAuth }             from "@/lib/firebaseAdmin";
import {
  createSessionCookie,
  sessionCookieOptions,
  COOKIE_NAME,
  MAX_AGE_SEC,
}                                from "@/lib/auth";

// ── POST /api/auth/session  (login) ──────────────────────────────────────────
export async function POST(req) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }

    // Verify the ID token is fresh (issued within the last 5 minutes)
    const decoded = await adminAuth.verifyIdToken(idToken);
    const ageMs   = Date.now() - decoded.auth_time * 1000;
    if (ageMs > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: "Token is too old. Please re-authenticate." },
        { status: 401 }
      );
    }

    const cookie = await createSessionCookie(idToken);
    const opts   = sessionCookieOptions(cookie);

    const res = NextResponse.json({ status: "ok", uid: decoded.uid });
    res.cookies.set(opts);
    return res;
  } catch (err) {
    console.error("[auth/session POST]", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 401 });
  }
}

// ── DELETE /api/auth/session  (logout) ────────────────────────────────────────
export async function DELETE() {
  const res = NextResponse.json({ status: "ok" });
  res.cookies.set({
    name:    COOKIE_NAME,
    value:   "",
    maxAge:  0,
    path:    "/",
  });
  return res;
}
