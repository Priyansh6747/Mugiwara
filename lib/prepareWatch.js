import { prefetchSkipTimes } from "@/lib/skipTimesCache";
import { prefetchSources } from "@/lib/sourceCache";

/** Resolve sources + skip times before navigation — play instantly on the watch page. */
export async function prepareWatch(showId, ep, mode = "sub") {
  const [, sources] = await Promise.all([
    prefetchSkipTimes(showId, ep),
    prefetchSources(showId, ep, mode),
  ]);
  return sources;
}
