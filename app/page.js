"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchPage() {
  const router = useRouter();

  const [query,   setQuery]   = useState("");
  const [mode,    setMode]    = useState("sub");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}&mode=${mode}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function goWatch(showId, epNo = "1") {
    router.push(`/watch/${encodeURIComponent(showId)}/${epNo}?mode=${mode}`);
  }

  return (
    <main style={{ fontFamily: "monospace", padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Mugiwara — Anime Search</h1>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          id="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anime..."
          style={{ flex: 1, padding: "0.5rem", fontSize: "1rem" }}
        />

        <select
          id="mode-select"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          style={{ padding: "0.5rem" }}
        >
          <option value="sub">Sub</option>
          <option value="dub">Dub</option>
        </select>

        <button
          id="search-btn"
          type="submit"
          disabled={loading}
          style={{ padding: "0.5rem 1rem" }}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <p id="search-error" style={{ color: "red" }}>Error: {error}</p>
      )}

      {results !== null && results.length === 0 && (
        <p>No results found for &quot;{query}&quot;.</p>
      )}

      {results && results.length > 0 && (
        <table id="results-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.4rem" }}>Title</th>
              <th style={{ textAlign: "center", borderBottom: "1px solid #ccc", padding: "0.4rem" }}>Episodes</th>
              <th style={{ textAlign: "center", borderBottom: "1px solid #ccc", padding: "0.4rem" }}>Watch</th>
            </tr>
          </thead>
          <tbody>
            {results.map((anime) => (
              <tr key={anime.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.4rem" }}>{anime.title}</td>
                <td style={{ textAlign: "center", padding: "0.4rem" }}>{anime.episodeCount}</td>
                <td style={{ textAlign: "center", padding: "0.4rem" }}>
                  <button
                    id={`watch-${anime.id}`}
                    onClick={() => goWatch(anime.id, "1")}
                    style={{ padding: "0.25rem 0.75rem", cursor: "pointer" }}
                  >
                    Ep 1 →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
