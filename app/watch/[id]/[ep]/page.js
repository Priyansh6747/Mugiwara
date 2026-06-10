"use client";

/**
 * app/watch/[id]/[ep]/page.js
 *
 * Video player page.
 *
 * Data flow:
 *   1. mount → GET /api/episodes/[id]                           → episode list
 *   2. mount → GET /api/source?…&quality=list → proxied /api/stream URLs only
 *   3. On start → seek to max(AniSkip intro end, URL ?t= or saved resume timestamp)
 *      Skip times are prefetched on continue-watching clicks and fetched in parallel on mount.
 *   4. Every 10 s during playback → POST /api/user/continue-watching (debounced)
 *   5. On ≥ 90 % completion → episode auto-moves to history via the API
 */

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams }                     from "next/navigation";
import { useAuth }                                        from "@/context/AuthContext";
import { useUserData }                                    from "@/hooks/useUserData";
import Loading                                            from "@/app/loading";
import { getCachedSkipTimes, prefetchSkipTimes }          from "@/lib/skipTimesCache";

// ── Icons ─────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15,18 9,12 15,6"/>
  </svg>
);

const BookmarkIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19,21 L12,16 L5,21 L5,3 L19,3 Z"/>
  </svg>
);

const LoaderIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 animate-spin text-blood" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/>
    <path d="M12,2 a10,10 0 0,1 10,10" stroke="currentColor"/>
  </svg>
);

const SubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="16" width="20" height="6" rx="1"/>
    <path d="M5,19 h4 M11,19 h2" opacity="0.7"/>
  </svg>
);

const DubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12,1 a11,11 0 0,1 0,22 a11,11 0 0,1 0,-22"/>
    <path d="M9,9 Q12,15 15,9" strokeLinecap="round"/>
  </svg>
);

// ── Progress save throttle: 10 s ──────────────────────────────────────────────

const SAVE_INTERVAL_MS = 10_000;

// ── Component ─────────────────────────────────────────────────────────────────

export default function WatchPage({ params }) {
  const { id, ep }   = use(params);
  const searchParams = useSearchParams();
  const mode         = searchParams.get("mode") === "dub" ? "dub" : "sub";
  const router       = useRouter();

  const { user }                                        = useAuth();
  const { saveProgress, getResumePoint, toggleWatchlist, isInWatchlist, continueWatching } = useUserData();

  // ── Metadata from searchParams (passed by AnimeCard links) ────────────────
  const title      = searchParams.get("title")  ?? "";
  const animeId    = searchParams.get("aid")    ?? id;   // AllAnime ID
  const anilistId  = Number(searchParams.get("alid") ?? 0);
  const coverImage    = searchParams.get("cover") ?? "";
  const urlTimestamp  = Number(searchParams.get("t") ?? 0);

  // ── Episode list ──────────────────────────────────────────────────────────
  const [episodes,  setEpisodes]  = useState([]);
  const [epLoading, setEpLoading] = useState(true);
  const [epError,   setEpError]   = useState(null);

  // ── Sources ───────────────────────────────────────────────────────────────
  const [sources,      setSources]      = useState([]);
  const [srcLoading,   setSrcLoading]   = useState(true);
  const [srcError,     setSrcError]     = useState(null);
  const [activeSource, setActiveSource] = useState(null);

  // ── Player state ──────────────────────────────────────────────────────────
  const videoRef        = useRef(null);
  const hlsRef          = useRef(null);
  const lastSavedRef      = useRef(0);
  const resumeApplied     = useRef(false);
  const metadataReadyRef  = useRef(false);
  const skipTimesRef      = useRef(null); // null = loading, object = settled
  const [inWL, setInWL] = useState(false);
  const [wlBusy, setWLBusy] = useState(false);
  const [alternatives, setAlternatives] = useState([]);
  const [hideLoader, setHideLoader] = useState(false);

  // Sync watchlist state
  useEffect(() => { setInWL(isInWatchlist(animeId)); }, [isInWatchlist, animeId]);

  // Fetch alternatives
  useEffect(() => {
    fetch(`/api/info/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(data => {
        if (data.alternatives) setAlternatives(data.alternatives);
      })
      .catch(console.error);
  }, [id]);

  // ── Fetch episode list ────────────────────────────────────────────────────
  useEffect(() => {
    setEpLoading(true);
    setEpError(null);
    fetch(`/api/episodes/${encodeURIComponent(id)}?mode=${mode}`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) throw new Error(data.error ?? "Bad response");
        setEpisodes(data);
      })
      .catch((err) => setEpError(err.message))
      .finally(() => setEpLoading(false));
  }, [id, mode]);

  // ── Fetch sources ─────────────────────────────────────────────────────────
  useEffect(() => {
    setSrcLoading(true);
    setSrcError(null);
    setSources([]);
    setActiveSource(null);
    resumeApplied.current = false;

    fetch(
      `/api/source?showId=${encodeURIComponent(id)}&ep=${encodeURIComponent(ep)}&mode=${mode}&quality=list`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) throw new Error(data.error ?? "No sources");
        setSources(data);
        if (data.length > 0) setActiveSource(data[0]);
      })
      .catch((err) => setSrcError(err.message))
      .finally(() => setSrcLoading(false));
  }, [id, ep, mode]);

  // Handle load errors/empty states to remove loader
  useEffect(() => {
    if (srcError || (!srcLoading && !activeSource)) {
      setHideLoader(true);
    }
  }, [srcError, srcLoading, activeSource]);

  // ── Attach proxied stream (/api/stream) — never load upstream CDN URLs ─────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource?.url) return;

    let cancelled = false;

    async function attach() {
      if (activeSource.type === "m3u8") {
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;

        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(activeSource.url);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) console.error("[hls]", data.type, data.details);
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = activeSource.url;
        } else {
          setSrcError("HLS playback is not supported in this browser.");
        }
        return;
      }

      video.src = activeSource.url;
    }

    attach().catch((err) => {
      console.error(err);
      setSrcError(err.message);
    });

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [activeSource]);

  // ── Start position: max(AniSkip intro end, continue-watching timestamp) ───
  const applyStartSeek = useCallback(() => {
    if (resumeApplied.current || !metadataReadyRef.current || !videoRef.current) return;
    if (skipTimesRef.current === null) return;

    const resume   = urlTimestamp > 0
      ? urlTimestamp
      : (user ? getResumePoint(animeId, Number(ep)) : 0);
    const introEnd = skipTimesRef.current?.op?.endTime ?? 0;
    const seekTo   = Math.max(introEnd, resume);

    if (seekTo > 5) {
      videoRef.current.currentTime = seekTo;
    }
    resumeApplied.current = true;
  }, [user, getResumePoint, animeId, ep, urlTimestamp]);

  useEffect(() => {
    resumeApplied.current    = false;
    metadataReadyRef.current = false;

    const cached = getCachedSkipTimes(id, ep);
    if (cached) {
      skipTimesRef.current = cached;
      applyStartSeek();
      return;
    }

    skipTimesRef.current = null;
    let cancelled = false;
    prefetchSkipTimes(id, ep).then((data) => {
      if (cancelled) return;
      skipTimesRef.current = data;
      applyStartSeek();
    });

    return () => { cancelled = true; };
  }, [id, ep, applyStartSeek]);

  const handleVideoLoaded = useCallback(() => {
    metadataReadyRef.current = true;
    applyStartSeek();
  }, [applyStartSeek]);

  const handleCanPlay = useCallback(() => {
    setHideLoader(true);
    if (videoRef.current && videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen().catch(err => {
        console.warn("Fullscreen auto-play blocked by browser:", err);
      });
    }
  }, []);

  // ── Save progress every 10 s ──────────────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    if (!user || !videoRef.current) return;
    const now = Date.now();
    if (now - lastSavedRef.current < SAVE_INTERVAL_MS) return;
    lastSavedRef.current = now;

    const vid = videoRef.current;
    saveProgress({
      animeId,
      anilistId,
      title,
      coverImage,
      episode:   Number(ep),
      episodeId: ep,
      timestamp: Math.floor(vid.currentTime),
      duration:  Math.floor(vid.duration) || 0,
    });
  }, [user, saveProgress, animeId, anilistId, title, coverImage, ep]);

  // ── Navigate to episode ───────────────────────────────────────────────────
  function goEpisode(epNo) {
    const qs = new URLSearchParams({ mode });
    if (title)      qs.set("title", title);
    if (animeId)    qs.set("aid",   animeId);
    if (anilistId)  qs.set("alid",  String(anilistId));
    if (coverImage) qs.set("cover", coverImage);
    router.push(`/watch/${encodeURIComponent(id)}/${epNo}?${qs}`);
  }

  // ── Toggle watchlist ──────────────────────────────────────────────────────
  async function handleWatchlist() {
    if (!user || wlBusy) return;
    setWLBusy(true);
    try {
      const { inWatchlist } = await toggleWatchlist({ animeId, anilistId, title, coverImage });
      setInWL(inWatchlist);
    } finally {
      setWLBusy(false);
    }
  }

  // ── Sub / Dub ─────────────────────────────────────────────────────────────
  function setMode(next) {
    if (next === mode) return;
    const qs = new URLSearchParams(searchParams);
    qs.set("mode", next);
    router.push(`/watch/${encodeURIComponent(id)}/${ep}?${qs}`);
  }

  // ── Current episode number for the progress bar ───────────────────────────
  const epNum    = Number(ep);
  const totalEps = episodes.length;

  return (
    <div className="flex flex-col min-h-screen bg-void text-parchment select-none">
      {/* Global Loading Overlay */}
      <div 
        className={`fixed inset-0 z-[500] transition-opacity duration-1000 ${
          hideLoader ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
        }`}
      >
        <Loading />
      </div>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center gap-4 px-5 py-3 bg-void/95 border-b border-bark backdrop-blur-sm">
        <button
          onClick={() => router.back()}
          id="watch-back-btn"
          className="flex items-center gap-1.5 text-fog/70 hover:text-parchment transition-colors font-ui text-[12px] tracking-wide"
        >
          <BackIcon />
          Back
        </button>

        <div className="flex-1 min-w-0">
          {title && (
            <h1 className="font-display text-sm font-bold text-parchment truncate leading-tight">
              {title}
            </h1>
          )}
          <p className="font-meta text-[11px] text-gold tracking-widest leading-none mt-0.5">
            Episode {ep} · {mode.toUpperCase()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Watchlist toggle — only when logged in */}
          {user && (
            <button
              onClick={handleWatchlist}
              disabled={wlBusy || !title}
              id="watch-watchlist-btn"
              title={inWL ? "Remove from watchlist" : "Add to watchlist"}
              className={`flex items-center gap-1.5 border font-ui text-[11px] tracking-wider uppercase px-3 py-1.5 rounded-sm transition-all disabled:opacity-40 ${
                inWL
                  ? "bg-blood/20 border-blood text-blood"
                  : "bg-bark/40 border-ink hover:border-gold text-fog/80 hover:text-gold"
              }`}
            >
              <BookmarkIcon filled={inWL} />
              {inWL ? "Saved" : "Save"}
            </button>
          )}
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Player ─────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Video */}
          <div className="relative bg-black w-full group/player" style={{ aspectRatio: "16/9", maxHeight: "72vh" }}>
            {/* Sub / Dub — on player */}
            <div
              id="watch-mode-picker"
              className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-void/85 backdrop-blur-sm border border-bark/60 rounded-sm p-0.5"
            >
              <button
                type="button"
                onClick={() => setMode("sub")}
                disabled={srcLoading}
                aria-pressed={mode === "sub"}
                className={`flex items-center gap-1 font-ui text-[11px] tracking-wider uppercase px-2.5 py-1.5 rounded-sm transition-all disabled:opacity-50 ${
                  mode === "sub"
                    ? "bg-blood/25 border border-blood/60 text-parchment"
                    : "border border-transparent text-fog/70 hover:text-parchment"
                }`}
              >
                <SubIcon />
                Sub
              </button>
              <button
                type="button"
                onClick={() => setMode("dub")}
                disabled={srcLoading}
                aria-pressed={mode === "dub"}
                className={`flex items-center gap-1 font-ui text-[11px] tracking-wider uppercase px-2.5 py-1.5 rounded-sm transition-all disabled:opacity-50 ${
                  mode === "dub"
                    ? "bg-blood/25 border border-blood/60 text-parchment"
                    : "border border-transparent text-fog/70 hover:text-parchment"
                }`}
              >
                <DubIcon />
                Dub
              </button>
            </div>

            {srcLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoaderIcon />
              </div>
            )}
            {srcError && !srcLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-2 px-6">
                  <p className="font-display text-blood text-lg font-bold">錯</p>
                  <p className="font-ui text-sm text-fog/80">{srcError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="font-ui text-xs text-gold hover:text-parchment transition-colors border border-gold/40 px-3 py-1.5 rounded-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
            {activeSource && (
              <video
                id="anime-player"
                ref={videoRef}
                key={activeSource.url}
                controls
                autoPlay
                playsInline
                onLoadedMetadata={handleVideoLoaded}
                onCanPlay={handleCanPlay}
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full"
                style={{ maxHeight: "72vh" }}
              />
            )}
          </div>

          {/* ── Below player ─────────────────────────────────────────────── */}
          <div className="px-5 py-4 space-y-4 border-t border-bark bg-ash/60">

            {/* Sub / Dub */}
            <div className="flex items-center gap-2 flex-wrap" id="watch-audio-picker">
              <span className="font-ui text-[11px] text-fog/50 tracking-wider uppercase">Audio</span>
              <button
                type="button"
                onClick={() => setMode("sub")}
                disabled={srcLoading}
                className={`flex items-center gap-1.5 font-ui text-[11px] px-2.5 py-1 rounded-sm border transition-all tracking-wide ${
                  mode === "sub"
                    ? "bg-blood/20 border-blood text-parchment"
                    : "bg-void border-ink text-fog/70 hover:border-fog/40 hover:text-parchment"
                }`}
              >
                <SubIcon />
                Sub
              </button>
              <button
                type="button"
                onClick={() => setMode("dub")}
                disabled={srcLoading}
                className={`flex items-center gap-1.5 font-ui text-[11px] px-2.5 py-1 rounded-sm border transition-all tracking-wide ${
                  mode === "dub"
                    ? "bg-blood/20 border-blood text-parchment"
                    : "bg-void border-ink text-fog/70 hover:border-fog/40 hover:text-parchment"
                }`}
              >
                <DubIcon />
                Dub
              </button>
            </div>

            {/* Quality picker */}
            {sources.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap" id="quality-picker">
                <span className="font-ui text-[11px] text-fog/50 tracking-wider uppercase">Quality</span>
                {sources.map((src, i) => (
                  <button
                    key={i}
                    id={`quality-${src.quality}`}
                    onClick={() => setActiveSource(src)}
                    className={`font-ui text-[11px] px-2.5 py-1 rounded-sm border transition-all tracking-wide ${
                      activeSource?.url === src.url
                        ? "bg-blood/20 border-blood text-parchment"
                        : "bg-void border-ink text-fog/70 hover:border-fog/40 hover:text-parchment"
                    }`}
                  >
                    {src.quality} <span className="opacity-50">{src.type}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Ep nav */}
            <div className="flex items-center gap-3">
              {epNum > 1 && (
                <button
                  onClick={() => goEpisode(epNum - 1)}
                  id="watch-prev-ep"
                  className="font-ui text-[12px] border border-ink hover:border-blood text-fog/70 hover:text-parchment px-4 py-2 rounded-sm transition-all"
                >
                  ← Ep {epNum - 1}
                </button>
              )}
              {episodes.includes(epNum + 1) || episodes.includes(String(epNum + 1)) ? (
                <button
                  onClick={() => goEpisode(epNum + 1)}
                  id="watch-next-ep"
                  className="font-ui text-[12px] bg-blood/10 border border-blood/60 hover:bg-blood/20 text-parchment px-4 py-2 rounded-sm transition-all"
                >
                  Ep {epNum + 1} →
                </button>
              ) : null}
            </div>

            {/* Alternatives section */}
            {alternatives.length > 0 && (
              <div className="pt-4 mt-4 border-t border-bark">
                <span className="font-ui text-[11px] text-fog/50 tracking-wider uppercase mb-2 block">Related Options (If video is wrong)</span>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {alternatives.map((alt) => (
                    <button
                      key={alt.id}
                      onClick={() => {
                        const qs = new URLSearchParams(searchParams);
                        // Route to the alternative's id, preserving other query params
                        router.push(`/watch/${encodeURIComponent(alt.id)}/1?${qs.toString()}`);
                      }}
                      className="text-left font-ui text-[12px] px-3 py-2 rounded-sm border border-ink text-fog/70 hover:border-fog/40 hover:text-parchment hover:bg-bark/30 transition-all flex justify-between items-center"
                    >
                      <span className="truncate flex-1">{alt.title}</span>
                      <span className="text-[10px] opacity-60 ml-2 shrink-0">{alt.episodeCount} Eps</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Episode sidebar ─────────────────────────────────────────────── */}
        <aside
          id="episode-list"
          className="w-52 shrink-0 border-l border-bark bg-ash overflow-y-auto flex flex-col"
          style={{ maxHeight: "calc(100vh - 53px)" }}
        >
          <div className="px-4 py-3 border-b border-bark sticky top-0 bg-ash z-10">
            <span className="font-ui text-[11px] text-fog/50 tracking-widest uppercase">Episodes</span>
            {totalEps > 0 && (
              <span className="ml-2 font-meta text-[10px] text-gold">{totalEps} total</span>
            )}
          </div>

          {epLoading && (
            <div className="flex-1 flex items-center justify-center py-8">
              <LoaderIcon />
            </div>
          )}
          {epError && (
            <p className="px-4 py-3 font-ui text-xs text-error">{epError}</p>
          )}

          <ul className="py-2">
            {episodes.map((epNo) => {
              const n        = Number(epNo);
              const isActive = String(epNo) === String(ep);
              // Show resume indicator if user has a saved timestamp for this ep
              const saved = continueWatching.find(
                (e) => e.animeId === animeId && Number(e.episode) === n
              );
              const progress = saved && saved.duration
                ? Math.min((saved.timestamp / saved.duration) * 100, 100)
                : 0;

              return (
                <li key={epNo}>
                  <button
                    id={`ep-btn-${epNo}`}
                    onClick={() => goEpisode(epNo)}
                    className={`relative w-full text-left px-4 py-2.5 font-ui text-[12px] tracking-wide transition-all group overflow-hidden ${
                      isActive
                        ? "bg-blood/15 text-parchment font-semibold border-l-2 border-blood"
                        : "text-fog/70 hover:text-parchment hover:bg-bark/30 border-l-2 border-transparent"
                    }`}
                  >
                    <span>Ep {epNo}</span>
                    {/* Progress bar */}
                    {progress > 0 && !isActive && (
                      <div
                        className="absolute bottom-0 left-0 h-[2px] bg-blood/60"
                        style={{ width: `${progress}%` }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}
