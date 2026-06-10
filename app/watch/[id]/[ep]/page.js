"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * /watch/[id]/[ep]
 *
 * Data flow:
 *   1. mount → GET /api/episodes/[id]   → episode list
 *   2. mount → GET /api/source?showId=&ep=&mode=&quality=list → all sources
 *   3. user picks quality → feed selected URL into <video>
 */
export default function WatchPage({ params }) {
  const { id, ep } = use(params);          // params is a Promise in Next 16
  const searchParams  = useSearchParams();
  const mode          = searchParams.get("mode") ?? "sub";
  const router        = useRouter();

  // ── Episode list state ────────────────────────────────────────────────────
  const [episodes, setEpisodes]   = useState([]);
  const [epLoading, setEpLoading] = useState(true);
  const [epError,   setEpError]   = useState(null);

  // ── Source state ──────────────────────────────────────────────────────────
  const [sources,       setSources]       = useState([]);
  const [srcLoading,    setSrcLoading]    = useState(true);
  const [srcError,      setSrcError]      = useState(null);
  const [activeSource,  setActiveSource]  = useState(null); // {url, quality, type, referer}

  const videoRef = useRef(null);

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

  // ── Fetch sources for current episode ────────────────────────────────────
  useEffect(() => {
    setSrcLoading(true);
    setSrcError(null);
    setSources([]);
    setActiveSource(null);

    fetch(`/api/source?showId=${encodeURIComponent(id)}&ep=${encodeURIComponent(ep)}&mode=${mode}&quality=list`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) throw new Error(data.error ?? "No sources");
        setSources(data);
        // Auto-select best (first after sort)
        if (data.length > 0) setActiveSource(data[0]);
      })
      .catch((err) => setSrcError(err.message))
      .finally(() => setSrcLoading(false));
  }, [id, ep, mode]);

  function goEpisode(epNo) {
    router.push(`/watch/${encodeURIComponent(id)}/${epNo}?mode=${mode}`);
  }

  return (
    <main style={{ fontFamily: "monospace", padding: "1rem", maxWidth: "1100px", margin: "0 auto" }}>
      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav style={{ marginBottom: "1rem" }}>
        <a href="/" id="back-home" style={{ textDecoration: "none" }}>
          ← Back to search
        </a>
        <span style={{ margin: "0 0.5rem" }}>|</span>
        <strong>Episode {ep}</strong>
        <span style={{ marginLeft: "0.5rem", color: "#666" }}>({mode})</span>
      </nav>

      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
        {/* ── Player area ───────────────────────────────────────────────── */}
        <div style={{ flex: 1 }}>
          {srcLoading && <p id="src-loading">Loading sources…</p>}
          {srcError   && <p id="src-error" style={{ color: "red" }}>Source error: {srcError}</p>}

          {activeSource && (
            <video
              id="anime-player"
              ref={videoRef}
              key={activeSource.url}          // remount when URL changes
              src={activeSource.url}
              controls
              autoPlay
              style={{ width: "100%", maxHeight: "520px", background: "#000" }}
            />
          )}

          {/* ── Quality picker ──────────────────────────────────────── */}
          {sources.length > 0 && (
            <div id="quality-picker" style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span>Quality:</span>
              {sources.map((src, i) => (
                <button
                  key={i}
                  id={`quality-${src.quality}`}
                  onClick={() => setActiveSource(src)}
                  style={{
                    padding: "0.2rem 0.6rem",
                    fontWeight: activeSource?.url === src.url ? "bold" : "normal",
                    border: activeSource?.url === src.url ? "2px solid #333" : "1px solid #ccc",
                    cursor: "pointer",
                  }}
                >
                  {src.quality} ({src.type})
                </button>
              ))}
            </div>
          )}

          {/* ── Source debug info ───────────────────────────────────── */}
          {activeSource && (
            <details style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#555" }}>
              <summary>Source info</summary>
              <pre id="source-info" style={{ overflowX: "auto" }}>
                {JSON.stringify(activeSource, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* ── Episode sidebar ───────────────────────────────────────────── */}
        <aside
          id="episode-list"
          style={{
            width: "160px",
            flexShrink: 0,
            maxHeight: "520px",
            overflowY: "auto",
            border: "1px solid #ddd",
            padding: "0.5rem",
          }}
        >
          <strong>Episodes</strong>
          {epLoading && <p>Loading…</p>}
          {epError   && <p style={{ color: "red" }}>{epError}</p>}
          <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0" }}>
            {episodes.map((epNo) => (
              <li key={epNo} style={{ marginBottom: "0.25rem" }}>
                <button
                  id={`ep-btn-${epNo}`}
                  onClick={() => goEpisode(epNo)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.2rem 0.4rem",
                    fontWeight: epNo === ep ? "bold" : "normal",
                    background: epNo === ep ? "#eee" : "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Ep {epNo}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
