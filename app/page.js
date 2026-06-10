import {
  getTrending,
  getPopular,
  getTopRated,
  getSeasonalAnime,
  getCurrentSeason,
} from "@/lib/AllAnime.js";
import AnimeRow, { SectionHeader } from "@/components/AnimeRow";
import UserBadge from "@/components/UserBadge";
import HeroWatchButton from "@/components/HeroWatchButton";

// ─── SVG Icons for UI ─────────────────────────────────────────────────────────

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const FilterIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" stroke="currentColor" strokeWidth="2">
    <polygon points="5,3 19,12 5,21" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// Genre SVG Icons
const SkullIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12,2 C7.5,2 4,5.5 4,10 C4,13 5.5,15.5 8,17 L8,20 C8,21 9,22 10,22 L14,22 C15,22 16,21 16,20 L16,17 C18.5,15.5 20,13 20,10 C20,5.5 16.5,2 12,2 Z" />
    <circle cx="9" cy="10" r="1.5" fill="currentColor" />
    <circle cx="15" cy="10" r="1.5" fill="currentColor" />
    <path d="M11,15 L13,15" />
  </svg>
);

const ShipIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2,13 C4,13 6,15 12,15 C18,15 20,13 22,13 L20,18 C19,19.5 17,20.5 12,20.5 C7,20.5 5,19.5 4,18 Z" />
    <path d="M12,4 L12,15 M12,5 C12,5 7,6 7,9 C7,12 12,12 12,12" />
  </svg>
);

const SwordsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4,20 L20,4 M18,2 L22,6 M15,5 L19,9" />
    <path d="M20,20 L4,4 M2,6 L6,2 M9,15 L5,19" opacity="0.6" />
  </svg>
);

const NinjaIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12,2 L14.5,9.5 L22,12 L14.5,14.5 L12,22 L9.5,14.5 L2,12 L9.5,9.5 Z" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

const DragonIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12,3 C12,3 6,6 4,10 C2,14 4,20 12,21 C20,20 22,14 20,10 C18,6 12,3 12,3 Z" />
    <path d="M12,3 L12,21 M4,10 L20,10" opacity="0.5" />
  </svg>
);

const MaskIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12,2 C6.5,2 3,6.5 3,12 C3,17.5 7.5,22 12,22 C16.5,22 21,17.5 21,12 C21,6.5 17.5,2 12,2 Z" />
    <circle cx="8" cy="11" r="1" fill="currentColor" />
    <circle cx="16" cy="11" r="1" fill="currentColor" />
    <path d="M9,16 Q12,18 15,16" />
  </svg>
);

const ToriiIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3,5 C7,4 17,4 21,5 M5,8 L19,8 M7,8 L7,20 M17,8 L17,20" />
  </svg>
);

const CompassIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M16,8 L14,14 L8,16 L10,10 Z" fill="currentColor" fillOpacity="0.3" />
  </svg>
);

// ─── Tiny Helpers ─────────────────────────────────────────────────────────────

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
}

// ─── Main Page Server Component ───────────────────────────────────────────────

export const metadata = {
  title: "Mugiwara — Anime",
  description: "Browse trending, popular, seasonal and currently airing anime.",
  icons: {
    icon: "/Icon.webp",
  },
};

export default async function HomePage() {
  const currentSeason = getCurrentSeason();
  let trending = [], popular = [], topRated = [], seasonal = [];
  let fetchError = null;

  try {
    // Fetch all 4 sections in parallel — only the server component makes API calls
    [trending, popular, topRated, seasonal] = await Promise.all([
      getTrending({ perPage: 20 }),
      getPopular({ perPage: 20 }),
      getTopRated({ perPage: 20 }),
      getSeasonalAnime({ ...currentSeason, perPage: 20 }),
    ]);
  } catch (err) {
    fetchError = err.message;
  }

  // Categories list with themed icons
  const categories = [
    { name: "Shounen", icon: <SkullIcon /> },
    { name: "Pirates", icon: <ShipIcon /> },
    { name: "Samurai", icon: <SwordsIcon /> },
    { name: "Ninja", icon: <NinjaIcon /> },
    { name: "Mythology", icon: <DragonIcon /> },
    { name: "Yokai", icon: <MaskIcon /> },
    { name: "Historical", icon: <ToriiIcon /> },
    { name: "Adventure", icon: <CompassIcon /> },
  ];



  // Determine Featured Hero Anime — prefer One Piece, else top trending
  const all = [...trending, ...popular, ...seasonal];
  const featuredAnime =
    all.find((a) => a.displayTitle.toLowerCase().includes("one piece")) ||
    trending[0] ||
    popular[0] || {
      displayTitle: "One Piece",
      genres: ["Adventure", "Fantasy", "Shounen"],
      description: "Follow Monkey D. Luffy and his crew as they sail the Grand Line in search of the ultimate treasure.",
      bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf3t2w8kL5gM.jpg",
      coverImage: { large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/nx21-WD1OtW1m28o1.jpg" },
    };

  const heroAnime = featuredAnime;
  const heroWatchUrl = `/search?q=${encodeURIComponent(heroAnime.displayTitle)}`;

  const { season, year } = currentSeason;
  const seasonLabel = season && year ? `${season.charAt(0) + season.slice(1).toLowerCase()} ${year}` : "";

  return (
    <div className="flex-1 flex flex-col p-6 max-w-[1300px] w-full mx-auto space-y-8 select-none ">
      
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-4">
        <form action="/search" method="GET" className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-fog/60">
            <SearchIcon />
          </div>
          <input
            type="text"
            name="q"
            placeholder="Search legends, ships, ronin..."
            className="bg-bark/40 border border-ink text-parchment placeholder-fog/40 rounded-[2px] pl-10 pr-10 py-2 w-full focus:outline-none focus:border-blood focus:ring-1 focus:ring-blood font-ui text-[13px] tracking-wide transition-all bg-noise"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-fog/60 hover:text-parchment cursor-pointer">
            <FilterIcon />
          </div>
        </form>

        {/* User profile */}
        <UserBadge />
      </header>

      {fetchError && (
        <div className="p-4 border border-blood/40 bg-blood/10 text-error rounded-sm font-ui text-sm">
          <span className="font-bold text-base mr-2">錯</span>
          The path is blocked. Failed to load voyage data: {fetchError}
        </div>
      )}

      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <section className="relative h-[320px] md:h-[400px] w-full rounded-[6px] overflow-hidden border border-bark bg-ash bg-wood-grain flex items-end">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${heroAnime.bannerImage || heroAnime.coverImage?.large})` }}
        />
        <div className="absolute inset-0 " />
        <div className="absolute inset-0 " />

        <div className="relative z-10 p-6 md:p-10 max-w-xl space-y-4">
          <div className="space-y-1.5">
            <div className="font-meta text-[11px] font-bold text-blood uppercase tracking-[0.2em]">
              Trending Now
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-black text-parchment tracking-wide drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] leading-tight">
              {heroAnime.displayTitle}
            </h1>
            <div className="font-ui text-xs text-gold/90 font-medium">
              {heroAnime.genres.slice(0, 3).join("  ·  ")}
            </div>
          </div>

          <p className="font-body text-sm text-fog/90 leading-relaxed line-clamp-3">
            {stripHtml(heroAnime.description)}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <HeroWatchButton anime={heroAnime} />
            <a 
              href="#watchlist"
              className="flex items-center gap-2 bg-transparent hover:bg-parchment/10 text-parchment border border-parchment/40 font-ui text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-[4px] transition-all"
            >
              <PlusIcon /> My Collection
            </a>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 flex items-center gap-2 z-10">
          <span className="w-2 h-2 rounded-full bg-blood" />
          <span className="w-1.5 h-1.5 rounded-full bg-fog/40" />
          <span className="w-1.5 h-1.5 rounded-full bg-fog/40" />
          <span className="w-1.5 h-1.5 rounded-full bg-fog/40" />
          <span className="w-1.5 h-1.5 rounded-full bg-fog/40" />
        </div>
      </section>

      {/* ── Category Pills ──────────────────────────────────────────────── */}
      <section className="relative overflow-x-auto py-2 -mx-6 px-6 no-scrollbar">
        <div className="flex items-center gap-3">
          {categories.map((cat) => (
            <a
              key={cat.name}
              href={`/search?q=${cat.name}`}
              className="flex items-center gap-2 bg-bark/40 border border-ink/60 hover:border-blood text-fog/90 hover:text-parchment px-4 py-2 rounded-[4px] font-ui text-xs tracking-wider transition-all duration-200 shrink-0 group hover:shadow-[0_0_10px_rgba(192,57,43,0.2)]"
            >
              <span className="text-fog/50 group-hover:text-blood transition-colors duration-200">
                {cat.icon}
              </span>
              <span>{cat.name}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ── Dynamic Content Sections ────────────────────────────────────── */}
      <div className="space-y-10">
        <AnimeRow items={trending}  title="🔥 Trending Now" />
        <AnimeRow items={popular}   title="👑 All-Time Popular" />
        <AnimeRow items={topRated}  title="⭐ Top Rated" />
        <AnimeRow items={seasonal}  title={`🌸 ${seasonLabel ? `${seasonLabel} Season` : "Current Season"}`} />
      </div>


      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="pt-8 border-t border-bark font-meta text-[11px] text-fog/50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          Data from{" "}
          <a href="https://anilist.co" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors underline decoration-dotted">AniList</a>
          {" "}· Streams via{" "}
          <a href="https://allanime.day" target="_blank" rel="noopener noreferrer" className="hover:text-blood transition-colors underline decoration-dotted">AllAnime</a>
        </div>
        <div className="italic">
          &quot;Beyond the horizon, further voyages await.&quot;
        </div>
      </footer>

    </div>
  );
}
