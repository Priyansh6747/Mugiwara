import { getHomepageData } from "@/lib/AllAnime.js";

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function fmtScore(score) {
  return score != null ? `${score}/100` : "N/A";
}

function fmtStatus(status) {
  const map = {
    RELEASING: "Airing",
    FINISHED: "Finished",
    NOT_YET_RELEASED: "Upcoming",
    CANCELLED: "Cancelled",
    HIATUS: "Hiatus",
  };
  return map[status] ?? status ?? "Unknown";
}

function fmtNextEp(nextAiringEpisode) {
  if (!nextAiringEpisode) return null;
  const { airingAt, episode } = nextAiringEpisode;
  const diff = airingAt * 1000 - Date.now();
  const days = Math.floor(diff / 86400000);
  const hrs  = Math.floor((diff % 86400000) / 3600000);
  return `Ep ${episode} in ${days}d ${hrs}h`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Compact card: image + title + score */
function AnimeCard({ anime }) {
  const watchUrl = `/search?q=${encodeURIComponent(anime.displayTitle)}`;

  return (
    <td style={{ verticalAlign: "top", width: "140px", padding: "4px" }}>
      <a href={watchUrl} style={{ textDecoration: "none", color: "inherit" }}>
        {anime.coverImage?.large && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={anime.coverImage.large}
            alt={anime.displayTitle}
            width={120}
            height={170}
            style={{ display: "block", objectFit: "cover" }}
          />
        )}
        <div style={{ fontSize: "0.8rem", marginTop: "2px", maxWidth: "120px" }}>
          <strong>{anime.displayTitle}</strong>
        </div>
        <div style={{ fontSize: "0.75rem", color: "#555" }}>
          ★ {fmtScore(anime.averageScore)}
          {anime.episodes ? ` · ${anime.episodes} eps` : ""}
        </div>
      </a>
    </td>
  );
}

/** Horizontal scrolling row of cards wrapped in a <table> */
function AnimeRow({ items }) {
  if (!items?.length) return <p>No data.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", whiteSpace: "nowrap" }}>
        <tbody>
          <tr>
            {items.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Currently-airing table with next-episode countdown */
function AiringTable({ items }) {
  if (!items?.length) return <p>No data.</p>;
  return (
    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.85rem" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid #ccc" }}>
          <th style={{ textAlign: "left",   padding: "4px 8px" }}>#</th>
          <th style={{ textAlign: "left",   padding: "4px 8px" }}>Title</th>
          <th style={{ textAlign: "center", padding: "4px 8px" }}>Score</th>
          <th style={{ textAlign: "left",   padding: "4px 8px" }}>Genres</th>
          <th style={{ textAlign: "left",   padding: "4px 8px" }}>Next Ep</th>
        </tr>
      </thead>
      <tbody>
        {items.map((anime, i) => {
          const countdown = fmtNextEp(anime.nextAiringEpisode);
          return (
            <tr key={anime.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "4px 8px", color: "#999" }}>{i + 1}</td>
              <td style={{ padding: "4px 8px" }}>
                <a
                  href={`/search?q=${encodeURIComponent(anime.displayTitle)}`}
                  style={{ textDecoration: "none" }}
                >
                  {anime.displayTitle}
                </a>
              </td>
              <td style={{ textAlign: "center", padding: "4px 8px" }}>
                {fmtScore(anime.averageScore)}
              </td>
              <td style={{ padding: "4px 8px", color: "#555" }}>
                {anime.genres.slice(0, 3).join(", ")}
              </td>
              <td style={{ padding: "4px 8px", color: "#888" }}>
                {countdown ?? "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Section header */
function Section({ title, children }) {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ borderBottom: "2px solid #333", paddingBottom: "4px", marginBottom: "8px" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Page (Server Component) ──────────────────────────────────────────────────

export const metadata = {
  title: "Mugiwara — Anime",
  description: "Browse trending, popular, seasonal and currently airing anime.",
  icons: {
    icon: "/Icon.webp",
  },
};

export default async function HomePage() {
  let data;
  let fetchError = null;

  try {
    data = await getHomepageData({ perPage: 20 });
  } catch (err) {
    fetchError = err.message;
  }

  const { season, year } = data?.currentSeason ?? {};
  const seasonLabel = season && year ? `${season.charAt(0) + season.slice(1).toLowerCase()} ${year}` : "";

  return (
    <main style={{ fontFamily: "monospace", padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* ── Site header ─────────────────────────────────────────────────── */}
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>🏴‍☠️ Mugiwara</h1>
        <p style={{ margin: "4px 0 0", color: "#666", fontSize: "0.85rem" }}>
          Anime powered by AniList + AllAnime
        </p>
        <nav style={{ marginTop: "8px" }}>
          <a href="/" style={{ marginRight: "1rem" }}>Home</a>
          <a href="/search" style={{ marginRight: "1rem" }}>Search</a>
        </nav>
      </header>

      {fetchError && (
        <p style={{ color: "red" }}>
          Failed to load homepage data: {fetchError}
        </p>
      )}

      {data && (
        <>
          {/* ── Trending ──────────────────────────────────────────────────── */}
          <Section title="🔥 Trending Now">
            <AnimeRow items={data.trending} />
          </Section>

          {/* ── Currently Airing ──────────────────────────────────────────── */}
          <Section title="📡 Currently Airing">
            <AiringTable items={data.airing} />
          </Section>

          {/* ── This Season ───────────────────────────────────────────────── */}
          <Section title={`🌸 This Season${seasonLabel ? ` — ${seasonLabel}` : ""}`}>
            <AnimeRow items={data.seasonal} />
          </Section>

          {/* ── All-time Popular ──────────────────────────────────────────── */}
          <Section title="👑 All-Time Popular">
            <AnimeRow items={data.popular} />
          </Section>

          {/* ── Top Rated ─────────────────────────────────────────────────── */}
          <Section title="⭐ Top Rated">
            <AnimeRow items={data.topRated} />
          </Section>
        </>
      )}

      {/* ── Search shortcut ───────────────────────────────────────────────── */}
      <footer style={{ marginTop: "2rem", borderTop: "1px solid #ddd", paddingTop: "1rem", fontSize: "0.8rem", color: "#888" }}>
        Data from{" "}
        <a href="https://anilist.co" target="_blank" rel="noopener noreferrer">AniList</a>
        {" "}· Streams via{" "}
        <a href="https://allanime.day" target="_blank" rel="noopener noreferrer">AllAnime</a>
      </footer>
    </main>
  );
}
