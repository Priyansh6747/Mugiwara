"use client";

/**
 * hooks/useUserData.js
 *
 * Fetches /api/user/me and exposes the current user's Firestore data:
 *   - continueWatching
 *   - watchHistory
 *   - watchlist
 *
 * Also exposes helpers that call the relevant API routes and auto-refresh.
 * Only fetches when there is a logged-in user.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

export function useUserData() {
  const { user } = useAuth();

  const [data, setData]       = useState(null);  // full /api/user/me payload
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const refresh = useCallback(async () => {
    if (!user) { setData(null); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/me");
      if (!res.ok) throw new Error("Failed to load user data");
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch on mount and whenever user changes
  useEffect(() => { refresh(); }, [refresh]);

  // ── Watchlist helpers ────────────────────────────────────────────────────────

  const toggleWatchlist = useCallback(async (entry) => {
    const res = await fetch("/api/user/watchlist", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(entry),
    });
    if (!res.ok) throw new Error("Watchlist update failed");
    const result = await res.json();
    await refresh();
    return result; // { inWatchlist: boolean }
  }, [refresh]);

  const isInWatchlist = useCallback((animeId) => {
    return (data?.watchlist ?? []).some((e) => e.animeId === animeId);
  }, [data]);

  // ── Continue Watching helpers ────────────────────────────────────────────────

  /**
   * Save a resume point.
   * @param {{ animeId, anilistId, title, coverImage, episode, episodeId, timestamp, duration }} entry
   */
  const saveProgress = useCallback(async (entry) => {
    if (!user) return;
    await fetch("/api/user/continue-watching", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(entry),
    });
    // Don't refresh here — called frequently during playback
  }, [user]);

  /** Get the resume timestamp for a specific episode (returns 0 if not found) */
  const getResumePoint = useCallback((animeId, episode) => {
    const entry = (data?.continueWatching ?? []).find(
      (e) => e.animeId === animeId && Number(e.episode) === Number(episode)
    );
    return entry?.timestamp ?? 0;
  }, [data]);

  /** Find a continue-watching entry by AniList ID */
  const getContinueEntry = useCallback((anilistId) => {
    return (data?.continueWatching ?? []).find(
      (e) => Number(e.anilistId) === Number(anilistId)
    );
  }, [data]);

  return {
    // Raw data
    continueWatching: data?.continueWatching ?? [],
    watchHistory:     data?.watchHistory     ?? [],
    watchlist:        data?.watchlist        ?? [],
    loading,
    error,
    refresh,
    // Helpers
    toggleWatchlist,
    isInWatchlist,
    saveProgress,
    getResumePoint,
    getContinueEntry,
  };
}
