/**
 * lib/firestore.js
 * Typed Firestore helpers for the two collections.
 *
 * ── Collection: UserData ─────────────────────────────────────────────────────
 *   /UserData/{uid}/
 *     continueWatching: [
 *       {
 *         animeId:      string,   // AllAnime ID
 *         anilistId:    number,   // AniList ID
 *         title:        string,
 *         coverImage:   string,
 *         episode:      number,
 *         episodeId:    string,   // AllAnime episode ID
 *         timestamp:    number,   // seconds into the video (resume point)
 *         duration:     number,   // total episode duration in seconds
 *         updatedAt:    Timestamp
 *       }
 *     ]
 *     watchHistory: [
 *       {
 *         animeId:    string,
 *         anilistId:  number,
 *         title:      string,
 *         coverImage: string,
 *         episode:    number,
 *         watchedAt:  Timestamp
 *       }
 *     ]
 *     watchlist: [
 *       {
 *         animeId:   string,
 *         anilistId: number,
 *         title:     string,
 *         coverImage:string,
 *         addedAt:   Timestamp
 *       }
 *     ]
 *
 * ── Collection: AnimeData ────────────────────────────────────────────────────
 *   /AnimeData/{animeId}
 *     {
 *       animeId:       string,   // AllAnime ID (doc ID)
 *       anilistId:     number,
 *       malId:         number | null,
 *       title:         string,   // English / romaji
 *       coverImage:    string,
 *       bannerImage:   string | null,
 *       genres:        string[],
 *       averageScore:  number | null,
 *       episodes:      number | null,
 *       status:        string,
 *       format:        string,
 *       sources: {
 *         [episodeId]: {
 *           urls:      { url: string, quality: string, type: string }[],
 *           cachedAt:  Timestamp
 *         }
 *       },
 *       cachedAt:      Timestamp,
 *       // TTL: AnimeData is considered stale after CACHE_TTL_MS
 *     }
 */

import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// ── Tunables ──────────────────────────────────────────────────────────────────

/** How long an AnimeData doc is considered fresh (24 h) */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Max entries kept in continueWatching / watchHistory arrays */
const MAX_CONTINUE_WATCHING = 20;
const MAX_HISTORY           = 100;

// ── Collection refs ───────────────────────────────────────────────────────────

const userRef  = (uid)     => adminDb.collection("UserData").doc(uid);
const animeRef = (animeId) => adminDb.collection("AnimeData").doc(animeId);

// ═══════════════════════════════════════════════════════════════════════════════
// UserData helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch the full UserData doc for a user.
 * Returns null if the document doesn't exist yet.
 */
export async function getUserData(uid) {
  const snap = await userRef(uid).get();
  return snap.exists ? snap.data() : null;
}

// ── Continue Watching ─────────────────────────────────────────────────────────

/**
 * Upsert a continueWatching entry.
 * Moves the entry to the front of the array (most-recently-watched first).
 * Trims the array to MAX_CONTINUE_WATCHING.
 *
 * @param {string} uid
 * @param {{ animeId, anilistId, title, coverImage, episode, episodeId, timestamp, duration }} entry
 */
export async function upsertContinueWatching(uid, entry) {
  const ref  = userRef(uid);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};

  const existing = (data.continueWatching ?? []).filter(
    (e) => !(e.animeId === entry.animeId && e.episode === entry.episode)
  );

  const updated = [
    { ...entry, updatedAt: Timestamp.now() },
    ...existing,
  ].slice(0, MAX_CONTINUE_WATCHING);

  await ref.set({ continueWatching: updated }, { merge: true });
}

/**
 * Remove a specific episode from continueWatching (e.g. on completion).
 */
export async function removeContinueWatching(uid, animeId, episode) {
  const ref  = userRef(uid);
  const snap = await ref.get();
  if (!snap.exists) return;

  const updated = (snap.data().continueWatching ?? []).filter(
    (e) => !(e.animeId === animeId && e.episode === episode)
  );

  await ref.set({ continueWatching: updated }, { merge: true });
}

// ── Watch History ─────────────────────────────────────────────────────────────

/**
 * Append an episode to watchHistory.
 * Deduplicates by (animeId, episode) — keeps the most recent entry.
 * Trims to MAX_HISTORY.
 *
 * @param {string} uid
 * @param {{ animeId, anilistId, title, coverImage, episode }} entry
 */
export async function addToHistory(uid, entry) {
  const ref  = userRef(uid);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};

  const existing = (data.watchHistory ?? []).filter(
    (e) => !(e.animeId === entry.animeId && e.episode === entry.episode)
  );

  const updated = [
    { ...entry, watchedAt: Timestamp.now() },
    ...existing,
  ].slice(0, MAX_HISTORY);

  await ref.set({ watchHistory: updated }, { merge: true });
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

/**
 * Add an anime to the user's watchlist.
 * No-ops if already present.
 *
 * @param {string} uid
 * @param {{ animeId, anilistId, title, coverImage }} entry
 */
export async function addToWatchlist(uid, entry) {
  const ref  = userRef(uid);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};

  const alreadyIn = (data.watchlist ?? []).some((e) => e.animeId === entry.animeId);
  if (alreadyIn) return { added: false };

  await ref.set(
    { watchlist: FieldValue.arrayUnion({ ...entry, addedAt: Timestamp.now() }) },
    { merge: true }
  );
  return { added: true };
}

/**
 * Remove an anime from the user's watchlist.
 *
 * @param {string} uid
 * @param {string} animeId
 */
export async function removeFromWatchlist(uid, animeId) {
  const ref  = userRef(uid);
  const snap = await ref.get();
  if (!snap.exists) return;

  const updated = (snap.data().watchlist ?? []).filter(
    (e) => e.animeId !== animeId
  );

  await ref.set({ watchlist: updated }, { merge: true });
}

/**
 * Toggle watchlist membership.
 * Returns { inWatchlist: boolean }
 */
export async function toggleWatchlist(uid, entry) {
  const ref  = userRef(uid);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};

  const alreadyIn = (data.watchlist ?? []).some((e) => e.animeId === entry.animeId);

  if (alreadyIn) {
    await removeFromWatchlist(uid, entry.animeId);
    return { inWatchlist: false };
  } else {
    await addToWatchlist(uid, entry);
    return { inWatchlist: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AnimeData helpers  (aggressive caching)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get cached anime metadata.
 * Returns null if not cached or if the cache is stale.
 *
 * @param {string} animeId - AllAnime ID (used as Firestore doc ID)
 */
export async function getCachedAnime(animeId) {
  const snap = await animeRef(animeId).get();
  if (!snap.exists) return null;

  const data = snap.data();
  const age  = Date.now() - data.cachedAt.toMillis();
  if (age > CACHE_TTL_MS) return null; // stale

  return data;
}

/**
 * Write / refresh anime metadata into the cache.
 *
 * @param {string} animeId
 * @param {object} meta — shape: { anilistId, malId, title, coverImage, bannerImage, genres, averageScore, episodes, status, format }
 */
export async function setCachedAnime(animeId, meta) {
  await animeRef(animeId).set(
    { ...meta, animeId, cachedAt: Timestamp.now() },
    { merge: true }
  );
}

/**
 * Cache episode source URLs for a specific episode.
 * Stored under `sources.{episodeId}` inside the AnimeData doc.
 *
 * @param {string} animeId
 * @param {string} episodeId
 * @param {{ url: string, quality: string, type: string }[]} urls
 */
export async function setCachedSources(animeId, episodeId, urls) {
  await animeRef(animeId).set(
    {
      [`sources.${episodeId}`]: {
        urls,
        cachedAt: Timestamp.now(),
      },
    },
    { merge: true }
  );
}

/**
 * Get cached source URLs for a specific episode.
 * Returns null if not cached or stale (1-hour TTL for sources).
 *
 * @param {string} animeId
 * @param {string} episodeId
 */
export async function getCachedSources(animeId, episodeId) {
  const snap = await animeRef(animeId).get();
  if (!snap.exists) return null;

  const entry = snap.data()?.sources?.[episodeId];
  if (!entry) return null;

  // Sources have a tighter TTL (1 h) — links expire
  const SOURCE_TTL_MS = 60 * 60 * 1000;
  const age = Date.now() - entry.cachedAt.toMillis();
  if (age > SOURCE_TTL_MS) return null;

  return entry.urls;
}
