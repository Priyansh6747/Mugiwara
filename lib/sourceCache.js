const cacheKey = (showId, ep, mode) => `src:${showId}:${ep}:${mode}`;

/** Prefer mp4 or lowest m3u8 — faster first frame than top-bitrate HLS. */
export function pickFastSource(sources) {
  if (!sources?.length) return null;
  const mp4 = sources.find((s) => s.type === "mp4");
  if (mp4) return mp4;
  const m3u8s = sources.filter((s) => s.type === "m3u8");
  if (m3u8s.length > 1) return m3u8s[m3u8s.length - 1];
  return sources[0];
}

export function getCachedSources(showId, ep, mode = "sub") {
  try {
    const raw = sessionStorage.getItem(cacheKey(showId, ep, mode));
    const data = raw ? JSON.parse(raw) : null;
    return Array.isArray(data) && data.length > 0 ? data : null;
  } catch {
    return null;
  }
}

/** Prefetch stream sources — call on continue-watching click before navigation. */
export function prefetchSources(showId, ep, mode = "sub") {
  const cached = getCachedSources(showId, ep, mode);
  if (cached) return Promise.resolve(cached);

  return fetch(
    `/api/source?showId=${encodeURIComponent(showId)}&ep=${encodeURIComponent(ep)}&mode=${mode}&quality=list`
  )
    .then((r) => r.json())
    .then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        try {
          sessionStorage.setItem(cacheKey(showId, ep, mode), JSON.stringify(data));
        } catch {}
      }
      return data;
    })
    .catch(() => []);
}

