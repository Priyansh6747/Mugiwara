/**
 * lib/auth.js
 * Server-side session utilities.
 *
 * Session cookie flow:
 *   1. Client gets an ID token from Firebase Auth
 *   2. Client POSTs the token to /api/auth/session
 *   3. Server calls adminAuth.createSessionCookie() → sets httpOnly cookie
 *   4. Subsequent API routes call verifySession(request) to get the decoded uid
 *   5. Client calls DELETE /api/auth/session to log out (clears cookie)
 */

import { adminAuth } from "@/lib/firebaseAdmin";
import { cookies }   from "next/headers";

const COOKIE_NAME    = "mugiwara_session";
const MAX_AGE_SEC    = Number(process.env.SESSION_COOKIE_MAX_AGE ?? 432000); // 5 days

// ── Create session cookie ─────────────────────────────────────────────────────

/**
 * Exchange a Firebase ID token for a long-lived session cookie.
 * Call this from the POST /api/auth/session route handler.
 *
 * @param {string} idToken — from getIdToken() on the client
 * @returns {string} the signed session cookie value
 */
export async function createSessionCookie(idToken) {
  return adminAuth.createSessionCookie(idToken, {
    expiresIn: MAX_AGE_SEC * 1000, // SDK wants milliseconds
  });
}

/**
 * Build the Set-Cookie options for the session cookie.
 */
export function sessionCookieOptions(value) {
  return {
    name:     COOKIE_NAME,
    value,
    maxAge:   MAX_AGE_SEC,
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
  };
}

// ── Verify session ────────────────────────────────────────────────────────────

/**
 * Verify the session cookie from the incoming request.
 * Returns the decoded token (contains uid, email, etc.) or null.
 *
 * @param {Request} [req] — optional; if omitted reads from next/headers cookies()
 * @returns {import("firebase-admin/auth").DecodedIdToken | null}
 */
export async function verifySession(req) {
  try {
    let sessionCookie;

    if (req) {
      // Route Handler — read from Request headers
      sessionCookie = req.cookies?.get?.(COOKIE_NAME)?.value
        ?? parseCookieHeader(req.headers.get("cookie"), COOKIE_NAME);
    } else {
      // Server Component — use next/headers
      const jar = await cookies();
      sessionCookie = jar.get(COOKIE_NAME)?.value;
    }

    if (!sessionCookie) return null;

    return await adminAuth.verifySessionCookie(sessionCookie, true /* checkRevoked */);
  } catch {
    return null;
  }
}

/**
 * Same as verifySession but throws a 401 Response if the session is invalid.
 * Useful inside Route Handlers that require auth.
 */
export async function requireSession(req) {
  const decoded = await verifySession(req);
  if (!decoded) {
    throw new Response(JSON.stringify({ error: "Unauthorised" }), {
      status:  401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return decoded;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseCookieHeader(header, name) {
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export { COOKIE_NAME, MAX_AGE_SEC };
