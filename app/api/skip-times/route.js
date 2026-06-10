/**
 * GET /api/skip-times?showId=<allanimeId>&ep=<n>
 * GET /api/skip-times?malId=<malId>&ep=<n>
 *
 * Returns AniSkip intro/outro intervals for the episode.
 */

import { NextResponse } from "next/server";
import { getSkipTimes, getMalId } from "@/lib/AllAnime.js";

export async function GET(req) {
  const { searchParams } = req.nextUrl;
  const ep = searchParams.get("ep");

  if (ep == null) {
    return NextResponse.json({ error: "ep is required" }, { status: 400 });
  }

  try {
    let malId = searchParams.get("malId");
    if (!malId) {
      const showId = searchParams.get("showId");
      if (!showId) {
        return NextResponse.json({ error: "showId or malId is required" }, { status: 400 });
      }
      malId = await getMalId(showId);
    }

    if (!malId) {
      return NextResponse.json({ found: false, op: null, ed: null });
    }

    const times = await getSkipTimes(malId, ep);
    return NextResponse.json(times);
  } catch (err) {
    console.error("[/api/skip-times]", err);
    return NextResponse.json({ found: false, op: null, ed: null });
  }
}
