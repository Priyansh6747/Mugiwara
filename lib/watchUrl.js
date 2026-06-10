/** Build a /watch URL from a continue-watching entry or resolved anime metadata. */
export function buildWatchUrl({ animeId, anilistId, title, coverImage, episode = 1, mode = "sub", timestamp }) {
  const qs = new URLSearchParams({
    mode,
    title: title ?? "",
    aid: animeId,
    alid: String(anilistId ?? ""),
  });
  if (coverImage) qs.set("cover", coverImage);
  if (timestamp > 0) qs.set("t", String(timestamp));
  return `/watch/${encodeURIComponent(animeId)}/${episode}?${qs.toString()}`;
}

/** Build a /watch URL directly from a Firestore continueWatching item. */
export function buildWatchUrlFromContinue(entry, mode = "sub") {
  return buildWatchUrl({
    animeId: entry.animeId,
    anilistId: entry.anilistId,
    title: entry.title,
    coverImage: entry.coverImage,
    episode: entry.episode ?? 1,
    mode,
    timestamp: entry.timestamp,
  });
}
