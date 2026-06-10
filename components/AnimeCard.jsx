"use client";

import { useState } from "react";

/* ─── Icons ─── */
const StarIcon = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current text-gold`} stroke="currentColor" strokeWidth="1.5">
    <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
  </svg>
);

const DotsVertical = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <circle cx="12" cy="6" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="12" cy="18" r="1.5" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export default function AnimeCard({ anime }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const totalEp = anime.episodes ?? anime.nextAiringEpisode?.episode ?? 0;
  const href = `/search?q=${encodeURIComponent(anime.displayTitle)}`;

  // Callback ref: fires whenever the img node mounts or changes.
  // If the browser already has the image cached, `onLoad` fires before React
  // attaches the handler — so we check `img.complete` here to catch that case.
  const imgRef = (node) => {
    if (!node) return;
    if (node.complete) {
      // Already loaded (cache hit) or already errored
      if (node.naturalWidth === 0) {
        setImgError(true);
      }
      setImgLoaded(true);
    }
  };

  return (
    <div className="w-[140px] md:w-[175px] lg:w-[195px] shrink-0 snap-start snap-always group relative select-none">
      {/* ── Image Container ── */}
      <a href={href} className="block aspect-[2/3] w-full rounded-[6px] overflow-hidden relative bg-ash isolate">

        {/* Zoom wrapper */}
        <div className="absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-[1.05]">
          {anime.coverImage?.large && !imgError ? (
            <img
              ref={imgRef}
              src={anime.coverImage.large}
              alt={anime.displayTitle}
              className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => { setImgError(true); setImgLoaded(true); }}
            />
          ) : (
            <img
              src="/Fallback.png"
              alt={anime.displayTitle}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}

          {/* Skeleton while loading */}
          {!imgLoaded && !imgError && anime.coverImage?.large && (
            <div className="absolute inset-0 bg-ash animate-pulse" />
          )}
        </div>

        {/* Vignette + bottom gradient */}
        <div className="absolute inset-0 card-vignette pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-void/70 via-void/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* 3-dot menu — hover only */}
        <button
          className="absolute top-2 right-2 z-10 p-1.5 rounded-[4px] bg-void/60 backdrop-blur-sm border border-bark/50 text-fog opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 hover:text-parchment hover:border-blood/60"
          aria-label="More options"
          onClick={(e) => e.preventDefault()}
        >
          <DotsVertical />
        </button>

        {/* Episode badge — bottom left */}
        {totalEp > 0 && (
          <div className="absolute bottom-2 left-2 z-10 font-meta text-[10px] md:text-[11px] text-fog/90 bg-void/80 backdrop-blur-sm border border-bark/50 px-1.5 py-0.5 rounded-[4px]">
            {totalEp} Eps
          </div>
        )}

        {/* Score badge — bottom right */}
        {anime.averageScore && (
          <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 bg-void/80 backdrop-blur-sm border border-bark/50 px-1.5 py-0.5 rounded-[4px]">
            <StarIcon />
            <span className="font-meta text-[10px] md:text-[11px] text-gold font-semibold">
              {anime.averageScore}
            </span>
          </div>
        )}

        {/* Center play button — hover only */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <div className="w-12 h-12 rounded-full bg-blood/90 text-parchment flex items-center justify-center shadow-[0_0_20px_rgba(192,57,43,0.5)] backdrop-blur-sm scale-90 group-hover:scale-100 transition-transform duration-300">
            <PlayIcon />
          </div>
        </div>

        {/* Hover border glow */}
        <div className="absolute inset-0 rounded-[6px] border-2 border-transparent group-hover:border-blood/80 group-hover:shadow-[0_0_20px_rgba(192,57,43,0.35)] transition-all duration-300 pointer-events-none" />
      </a>

      {/* ── Text below ── */}
      <div className="mt-2.5 space-y-0.5 px-0.5">
        <a
          href={href}
          className="block font-heading text-[11px] md:text-[12px] font-bold text-parchment/90 line-clamp-1 leading-tight group-hover:text-blood transition-colors duration-200"
        >
          {anime.displayTitle}
        </a>
        <p className="font-meta text-[10px] text-fog/50 leading-tight">
          {anime.status === "RELEASING" && anime.nextAiringEpisode ? (
            <span className="text-ember">Ep {anime.nextAiringEpisode.episode} soon</span>
          ) : anime.status === "FINISHED" ? (
            <span>Finished · {anime.format ?? "TV"}</span>
          ) : (
            <span>{anime.format ?? "TV"}</span>
          )}
        </p>
      </div>
    </div>
  );
}
