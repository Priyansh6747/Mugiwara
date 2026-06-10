"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import { buildWatchUrl, buildWatchUrlFromContinue } from "@/lib/watchUrl";
import { prefetchSkipTimes } from "@/lib/skipTimesCache";

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" stroke="currentColor" strokeWidth="2">
    <polygon points="5,3 19,12 5,21" />
  </svg>
);

const LoaderIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin text-parchment" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/>
    <path d="M12,2 a10,10 0 0,1 10,10" stroke="currentColor"/>
  </svg>
);

export default function HeroWatchButton({ anime }) {
  const router = useRouter();
  const { user } = useAuth();
  const { getContinueEntry } = useUserData();
  const [isResolving, setIsResolving] = useState(false);
  const searchHref = `/search?q=${encodeURIComponent(anime.displayTitle)}`;
  const anilistId = anime.animeId ?? anime.id ?? anime.anilistId;
  const savedEntry = user ? getContinueEntry(anilistId) : null;
  const href = savedEntry?.animeId
    ? buildWatchUrlFromContinue(savedEntry)
    : searchHref;

  const handleClick = async (e) => {
    if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();

    if (savedEntry?.animeId) {
      prefetchSkipTimes(savedEntry.animeId, savedEntry.episode ?? 1);
      router.push(buildWatchUrlFromContinue(savedEntry));
      return;
    }

    if (isResolving) return;
    setIsResolving(true);

    try {

      const qs = new URLSearchParams({
        alid: String(anilistId ?? ""),
        q: anime.displayTitle,
        mode: "sub",
      });
      if (anime.malId != null) qs.set("malId", String(anime.malId));
      const res = await fetch(`/api/resolve?${qs.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to resolve");

      router.push(buildWatchUrl({
        animeId: data.id,
        anilistId,
        title: anime.displayTitle,
        coverImage: anime.coverImage?.large,
      }));
    } catch (err) {
      console.error(err);
      router.push(searchHref);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <a 
      href={href}
      onClick={handleClick}
      className="flex items-center gap-2 bg-blood hover:bg-blood/90 text-parchment font-ui text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-[4px] hover:shadow-[0_0_15px_rgba(192,57,43,0.5)] transition-all"
    >
      {isResolving ? <LoaderIcon /> : <PlayIcon />}
      {isResolving
        ? "Loading..."
        : savedEntry
          ? "Continue"
          : "Watch Now"}
    </a>
  );
}
