const cacheKey = (showId, ep) => `skip:${showId}:${ep}`;

export function getCachedSkipTimes(showId, ep) {
  try {
    const raw = sessionStorage.getItem(cacheKey(showId, ep));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Fetch AniSkip data and cache it. Safe to call before navigation. */
export function prefetchSkipTimes(showId, ep) {
  const cached = getCachedSkipTimes(showId, ep);
  if (cached) return Promise.resolve(cached);

  return fetch(
    `/api/skip-times?showId=${encodeURIComponent(showId)}&ep=${encodeURIComponent(ep)}`
  )
    .then((r) => r.json())
    .then((data) => {
      try {
        sessionStorage.setItem(cacheKey(showId, ep), JSON.stringify(data));
      } catch {}
      return data;
    })
    .catch(() => ({ found: false, op: null, ed: null }));
}
