"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import AnimeCard from "./AnimeCard";

/* ─── Icons ─── */
const ChevronLeft = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" className="w-5 h-5">
        <path d="M15 18l-6-6 6-6" />
    </svg>
);

const ChevronRight = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" className="w-5 h-5">
        <path d="M9 18l6-6-6-6" />
    </svg>
);

/* ─── Brushstroke ─── */
const BrushStroke = () => (
    <svg viewBox="0 0 300 20" preserveAspectRatio="none" className="h-2 w-32 md:w-48 text-blood opacity-40 ml-4 inline-block select-none">
        <path d="M 10 10 Q 60 4 120 12 T 240 7 T 290 10 Q 240 16 140 10 T 10 10" fill="currentColor" />
    </svg>
);

/* ─── Section Header ─── */
export const SectionHeader = ({ title, viewAllLink = "#" }) => (
    <div className="flex items-end justify-between mb-5 select-none">
        <div className="flex items-center">
            <h2 className="font-heading text-xl md:text-2xl font-bold tracking-wider text-parchment">
                {title}
            </h2>
            <BrushStroke />
        </div>
        <a
            href={viewAllLink}
            className="group font-ui text-xs text-fog hover:text-blood transition-colors duration-200 font-medium flex items-center gap-1.5 pb-0.5"
        >
            <span>View All</span>
            <span className="text-[10px] opacity-60 group-hover:translate-x-0.5 transition-transform duration-200">&gt;</span>
        </a>
    </div>
);

/* ─── Skeleton ─── */
const SkeletonCard = () => (
    <div className="w-[140px] md:w-[175px] lg:w-[195px] shrink-0 snap-start">
        <div className="aspect-[2/3] w-full rounded-[6px] bg-ash animate-pulse" />
        <div className="mt-2.5 h-3 w-3/4 bg-ash rounded animate-pulse" />
        <div className="mt-1.5 h-2.5 w-1/2 bg-ash/60 rounded animate-pulse" />
    </div>
);

/*
 * ─── LiftCard ───────────────────────────────────────────────────────────────
 * Wraps any AnimeCard with Netflix-style hover uplift.
 * - Scales up 1.08× and lifts -6px on hover
 * - Elevates z-index so the scaled card sits above its neighbours
 * - A frosted info strip slides up from the card bottom with title + score
 *   (gracefully falls back if `anime` props are absent)
 */
const LiftCard = ({ anime, index }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            className="shrink-0 snap-start relative w-[140px] md:w-[175px] lg:w-[195px]"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div
                className="relative cursor-pointer rounded-[6px] overflow-visible w-full"
                style={{
                    transform: hovered ? "translateY(-8px) scale(1.05)" : "translateY(0) scale(1)",
                    transition: "transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    zIndex: hovered ? 30 : 1,
                }}
            >
                {/* The actual card — unchanged from existing AnimeCard */}
                <AnimeCard anime={anime} />

                {/* ── Hover info strip ── */}
                <div
                    className="absolute bottom-0 left-0 right-0 rounded-b-[6px] overflow-hidden pointer-events-none"
                    style={{
                        /* slide up from 0 height to auto */
                        maxHeight: hovered ? "52px" : "0px",
                        transition: "max-height 0.2s ease",
                    }}
                >
                    <div
                        className="px-2 py-2 flex items-center justify-between gap-1"
                        style={{
                            background: "linear-gradient(to top, rgba(10,8,6,0.92) 0%, rgba(10,8,6,0.75) 100%)",
                            backdropFilter: "blur(4px)",
                        }}
                    >
                        {/* Title */}
                        <span
                            className="font-ui text-parchment/90 leading-tight truncate"
                            style={{ fontSize: "10px", maxWidth: "80%" }}
                        >
              {anime?.displayTitle ?? anime?.name ?? ""}
            </span>

                        {/* Score badge */}
                        {(anime?.score ?? anime?.rating) && (
                            <span
                                className="shrink-0 flex items-center gap-0.5 font-ui font-semibold text-[10px]"
                                style={{ color: "#e8c96b" }}
                            >
                <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5">
                  <path d="M6 1l1.39 2.82L10.5 4.27l-2.25 2.19.53 3.1L6 8.02 3.22 9.56l.53-3.1L1.5 4.27l3.11-.45z" />
                </svg>
                                {anime?.score ?? anime?.rating}
              </span>
                        )}
                    </div>
                </div>

                {/* ── Hover ring ── */}
                {hovered && (
                    <div
                        className="absolute inset-0 rounded-[6px] pointer-events-none"
                        style={{
                            boxShadow: "0 0 0 1.5px rgba(192,57,43,0.55), 0 12px 28px rgba(0,0,0,0.55)",
                        }}
                    />
                )}
            </div>
        </div>
    );
};

/* ─── Main Row ─── */
export default function AnimeRow({ items, title, isLoading = false }) {
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 10);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        checkScroll();
        el.addEventListener("scroll", checkScroll, { passive: true });
        return () => el.removeEventListener("scroll", checkScroll);
    }, [checkScroll, items]);

    const scroll = (dir) => {
        const el = scrollRef.current;
        if (!el) return;
        const cardW = el.firstElementChild?.clientWidth ?? 195;
        el.scrollBy({ left: dir * (cardW + 16) * 3, behavior: "smooth" });
    };

    /* Empty state */
    if (!isLoading && (!items || items.length === 0)) {
        return (
            <section className="space-y-4">
                <SectionHeader title={title} />
                <div className="py-12 flex flex-col items-center justify-center border border-dashed border-bark/40 rounded-[6px] bg-ash/20">
                    <span className="font-kanji text-4xl text-blood/30 mb-2">虚</span>
                    <p className="font-body text-sm text-fog/50">No voyage data found.</p>
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-2 relative">
            <SectionHeader title={title} />

            <div className="relative">

                <div
                    className={`absolute left-0 top-0 bottom-0 w-6 md:w-10`}/>
                <div
                    className={`
            absolute right-0 top-0 bottom-0 w-6 md:w-10`}/>

                {/* Left arrow */}
                <button
                    onClick={() => scroll(-1)}
                    aria-label="Scroll left"
                    className={`
            absolute left-1 top-[38%] -translate-y-1/2 z-20
            w-9 h-9 md:w-11 md:h-11
            flex items-center justify-center
            bg-void/90 border border-bark/60 text-parchment rounded-[4px]
            hover:border-blood hover:text-blood hover:shadow-[0_0_15px_rgba(192,57,43,0.3)]
            transition-all duration-200 backdrop-blur-sm
            ${canScrollLeft ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"}
          `}
                >
                    <ChevronLeft />
                </button>

                {/* Right arrow */}
                <button
                    onClick={() => scroll(1)}
                    aria-label="Scroll right"
                    className={`
            absolute right-1 top-[38%] -translate-y-1/2 z-20
            w-9 h-9 md:w-11 md:h-11
            flex items-center justify-center
            bg-void/90 border border-bark/60 text-parchment rounded-[4px]
            hover:border-blood hover:text-blood hover:shadow-[0_0_15px_rgba(192,57,43,0.3)]
            transition-all duration-200 backdrop-blur-sm
            ${canScrollRight ? "opacity-100 translate-x-0" : "opacity-0 translate-x-3 pointer-events-none"}
          `}
                >
                    <ChevronRight />
                </button>

                {/*
         * Scroll track
         * overflow-visible on the inner track so scaled cards don't get
         * clipped — the outer wrapper clips instead via px-6 padding.
         */}
                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto pb-5 pt-2 no-scrollbar snap-x snap-mandatory -mx-6 px-6"
                    style={{ overflowY: "visible" }}
                >
                    {isLoading
                        ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                        : items.map((anime, i) => (
                            <LiftCard key={anime.id ?? i} anime={anime} index={i} />
                        ))
                    }
                </div>
            </div>
        </section>
    );
}