import { decodeStreamToken, corsHeaders, proxyStreamRequest } from "@/lib/streamProxy";

export const runtime = "nodejs";

/**
 * GET /api/stream?t=<signed-token>
 * Server-side media proxy — client never touches upstream CDN URLs.
 */
export async function GET(request) {
  const token = request.nextUrl.searchParams.get("t");
  const target = decodeStreamToken(token);

  if (!target) {
    return Response.json({ error: "Invalid or expired stream token" }, {
      status: 403,
      headers: corsHeaders(),
    });
  }

  const origin = request.nextUrl.origin;

  try {
    return await proxyStreamRequest(request, target, origin);
  } catch (err) {
    console.error("[/api/stream]", err.message);
    return Response.json({ error: "Stream proxy failed" }, {
      status: 502,
      headers: corsHeaders(),
    });
  }
}

export async function HEAD(request) {
  return GET(request);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
