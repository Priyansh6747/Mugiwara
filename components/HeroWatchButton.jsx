"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [isResolving, setIsResolving] = useState(false);
  const href = `/search?q=${encodeURIComponent(anime.displayTitle)}`;

  const handleClick = async (e) => {
    if (e.button === 1 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();

    if (isResolving) return;
    setIsResolving(true);

    try {
      const qs = new URLSearchParams({
        alid: String(anime.id || anime.anilistId || ""),
        q: anime.displayTitle,
        mode: "sub"
      });
      const res = await fetch(`/api/resolve?${qs.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to resolve");

      const wqs = new URLSearchParams({
        mode: "sub",
        title: anime.displayTitle,
        aid: data.id,
        alid: String(anime.id || anime.anilistId || "")
      });
      if (anime.coverImage?.large) {
        wqs.set("cover", anime.coverImage.large);
      }

      router.push(`/watch/${encodeURIComponent(data.id)}/1?${wqs.toString()}`);
    } catch (err) {
      console.error(err);
      router.push(href);
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
      {isResolving ? "Loading..." : "Watch Now"}
    </a>
  );
}
