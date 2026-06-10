"use client";

import { useAuth } from "@/context/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import AnimeRow from "@/components/AnimeRow";

function toAnimeItem(entry) {
  return {
    animeId: entry.anilistId,
    id: entry.anilistId,
    displayTitle: entry.title,
    coverImage: entry.coverImage ? { large: entry.coverImage } : null,
    continueEpisode: entry.episode,
    continueEntry: entry,
  };
}

export default function ContinueWatchingRow() {
  const { user } = useAuth();
  const { continueWatching, loading } = useUserData();

  if (!user || loading || continueWatching.length === 0) return null;

  return (
    <AnimeRow
      title="▶ Continue Watching"
      items={continueWatching.map(toAnimeItem)}
    />
  );
}
