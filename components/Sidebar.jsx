"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";

const MugiwaraLogo = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 text-[#E8D5B0] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Crossed Bones */}
    <path d="M20,20 L80,80 M20,80 L80,20" strokeWidth="3" opacity="0.4" />
    <circle cx="20" cy="20" r="4" fill="currentColor" opacity="0.4" />
    <circle cx="80" cy="80" r="4" fill="currentColor" opacity="0.4" />
    <circle cx="20" cy="80" r="4" fill="currentColor" opacity="0.4" />
    <circle cx="80" cy="20" r="4" fill="currentColor" opacity="0.4" />
    {/* Skull Base */}
    <path d="M35,45 C35,25 65,25 65,45 C65,55 60,60 58,65 L58,72 C58,74 56,76 54,76 L46,76 C44,76 42,74 42,72 L42,65 C40,60 35,55 35,45 Z" fill="#0D0A08" strokeWidth="2.5" />
    {/* Skull Eyes & Nose */}
    <circle cx="43" cy="48" r="3.5" fill="currentColor" />
    <circle cx="57" cy="48" r="3.5" fill="currentColor" />
    <path d="M49,56 L51,56 L50,53 Z" fill="currentColor" />
    {/* Teeth */}
    <path d="M46,70 L54,70 M46,73 L54,73 M50,67 L50,76" strokeWidth="1.5" />
    {/* Straw Hat */}
    <path d="M25,40 C35,38 65,38 75,40 C82,41 78,35 70,33 C65,30 35,30 30,33 C22,35 18,41 25,40 Z" fill="#C9A84C" stroke="#C9A84C" strokeWidth="2" />
    <path d="M33,33 C33,24 67,24 67,33" fill="#C9A84C" stroke="#C9A84C" strokeWidth="2" />
    <path d="M32,34 C35,35 65,35 68,34" stroke="#C0392B" strokeWidth="4" /> {/* Red ribbon */}
  </svg>
);

const ShipWheelIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12,2 L12,22 M2,12 L22,12 M5,5 L19,19 M5,19 L19,5" />
  </svg>
);

const CompassIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M16.2,7.8 L13.2,13.2 L7.8,16.2 L10.8,10.8 Z" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

const ShipIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2,13 C4,13 6,15 12,15 C18,15 20,13 22,13 L20,18 C19,19.5 17,20.5 12,20.5 C7,20.5 5,19.5 4,18 Z" fill="currentColor" fillOpacity="0.1" />
    <path d="M12,4 L12,15 M12,5 C12,5 7,6 7,9 C7,12 12,12 12,12 M12,6 C12,6 18,7 18,10 C18,13 12,13 12,13" />
  </svg>
);

const ScrollIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4,18 C2.9,18 2,17.1 2,16 L2,6 C2,4.9 2.9,4 4,4 L18,4 C20.2,4 22,5.8 22,8 L22,18 C22,20.2 20.2,22 18,22 L6,22 C4.9,22 4,21.1 4,20" />
    <path d="M18,18 C16.9,18 16,17.1 16,16 L16,6" />
    <path d="M6,8 L12,8 M6,12 L12,12 M6,16 L10,16" opacity="0.6" />
  </svg>
);

const ToriiIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3,5 C7,4 17,4 21,5 M5,8 L19,8 M7,8 L7,20 M17,8 L17,20 M9,5 L9,8 M15,5 L15,8" />
  </svg>
);

const MaskIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12,2 C6.5,2 3,6.5 3,12 C3,17.5 7.5,22 12,22 C16.5,22 21,17.5 21,12 C21,6.5 17.5,2 12,2 Z" />
    <path d="M8,10 C8,10 9,11 10,11 C11,11 11.5,10 11.5,10 M12.5,10 C12.5,10 13,11 14,11 C15,11 16,10 16,10" />
    <path d="M9,15 C10,16.5 14,16.5 15,15" />
    <path d="M6,6 L8,8 M18,6 L16,8" opacity="0.6" />
  </svg>
);

const BookmarkIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19,21 L12,16 L5,21 L5,3 L19,3 Z" />
    <path d="M9,7 L15,7 M9,11 L13,11" opacity="0.6" strokeWidth="1.5" />
  </svg>
);

const HourglassIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5,2 L19,2 M5,22 L19,22 M5,2 C5,2 5,10 12,12 C19,10 19,2 19,2 M5,22 C5,22 5,14 12,12 C19,14 19,22 19,22" />
    <path d="M10,6 L14,6 M11,17 L13,17" opacity="0.6" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9,21 H5 a2,2 0 0 1 -2,-2 V5 a2,2 0 0 1 2,-2 h4"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const ToriiGraphic = () => (
  <svg viewBox="0 0 120 80" className="w-24 h-16 mx-auto opacity-10 text-[#E8D5B0]" fill="none" stroke="currentColor" strokeWidth="1.5">
    {/* Curved top beam */}
    <path d="M10,25 C30,21 90,21 110,25 L105,30 C85,26 35,26 15,30 Z" fill="currentColor" fillOpacity="0.2" />
    {/* Straight middle beam */}
    <path d="M20,38 L100,38" strokeWidth="2" />
    {/* Pillars */}
    <path d="M35,38 L31,75" strokeWidth="2.5" />
    <path d="M85,38 L89,75" strokeWidth="2.5" />
    {/* Support blocks */}
    <rect x="30" y="30" width="10" height="4" fill="currentColor" />
    <rect x="80" y="30" width="10" height="4" fill="currentColor" />
    {/* Ground line */}
    <path d="M5,75 L115,75" strokeWidth="1" />
  </svg>
);

// ── Avatar helper ─────────────────────────────────────────────────────────────

function UserAvatar({ user }) {
  if (user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt={user.displayName ?? "User"}
        className="w-8 h-8 rounded-full border border-gold object-cover"
      />
    );
  }
  const initials = (user.displayName ?? user.email ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full border border-gold bg-blood/20 flex items-center justify-center font-ui text-xs font-bold text-gold select-none">
      {initials}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const menuItems = [
    { name: "Home",             href: "/",           icon: ShipWheelIcon },
    { name: "Explore",          href: "/search",     icon: CompassIcon },
    { name: "Fleet",            href: "#fleet",      icon: ShipIcon },
    { name: "Collections",      href: "#collections",icon: ScrollIcon },
    { name: "Journey",          href: "#journey",    icon: ToriiIcon },
    { name: "Genres",           href: "#genres",     icon: MaskIcon },
    { name: "Watchlist",        href: "#watchlist",  icon: BookmarkIcon },
    { name: "Recently Watched", href: "#recent",     icon: HourglassIcon },
  ];

  return (
    <>
      <aside className="w-60 bg-ash border-r border-bark flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none bg-wood-grain z-50">
        {/* Brand Logo & Name */}
        <div className="pt-6 px-6 pb-4">
          <Link href="/" className="flex items-center gap-3 group">
            <MugiwaraLogo />
            <div>
              <div className="font-display text-xl font-bold tracking-wider text-parchment leading-none group-hover:text-blood transition-colors">
                MUGIWARA
              </div>
              <div className="font-ui text-[10px] tracking-[0.25em] text-gold mt-1">
                麦わらの道
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 py-4 overflow-y-auto px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative flex items-center gap-3 h-11 px-3 rounded-sm font-ui text-[13px] tracking-wide transition-all group overflow-hidden ${
                  isActive
                    ? "text-parchment font-semibold"
                    : "text-fog/70 hover:text-parchment"
                }`}
              >
                {/* Brushstroke indicator background */}
                {isActive && (
                  <div
                    className="absolute inset-0 bg-blood/10 -z-10 animate-fade-in"
                    style={{
                      borderLeft: "3px solid #C0392B",
                      backgroundImage: "linear-gradient(90deg, rgba(192, 57, 43, 0.15), transparent)",
                    }}
                  />
                )}

                <span className={`transition-all duration-300 ${
                  isActive ? "text-blood drop-shadow-[0_0_8px_rgba(192,57,43,0.6)]" : "text-fog/60 group-hover:text-blood group-hover:drop-shadow-[0_0_4px_rgba(192,57,43,0.4)]"
                }`}>
                  <Icon />
                </span>

                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-bark bg-void/50 space-y-4">
          <div>
            <ToriiGraphic />
          </div>

          {/* ── User section ── */}
          {loading ? (
            /* Skeleton */
            <div className="h-10 rounded-sm bg-bark/40 animate-pulse" />
          ) : user ? (
            /* Logged in */
            <div className="bg-bark/40 border border-ink rounded-sm p-3 flex items-center gap-2.5">
              <UserAvatar user={user} />
              <div className="flex-1 min-w-0">
                <div className="font-ui text-[12px] font-semibold text-parchment truncate leading-tight">
                  {user.displayName ?? "Crew Member"}
                </div>
                <div className="font-meta text-[10px] text-fog/60 truncate leading-none mt-0.5">
                  {user.email}
                </div>
              </div>
              <button
                onClick={signOut}
                id="sidebar-signout-btn"
                title="Sign out"
                className="text-fog/40 hover:text-blood transition-colors shrink-0"
              >
                <LogoutIcon />
              </button>
            </div>
          ) : (
            /* Logged out */
            <div className="bg-bark/40 border border-ink p-3 rounded-sm text-center space-y-2">
              <div className="font-heading text-xs tracking-wider text-gold font-bold">
                Join the Crew
              </div>
              <div className="font-body text-[11px] text-fog/80 leading-normal">
                Sign in to track your voyages and save your collection.
              </div>
              <button
                onClick={() => setShowAuthModal(true)}
                id="sidebar-login-btn"
                className="w-full mt-1 font-ui text-[11px] text-blood hover:text-gold transition-colors font-bold uppercase tracking-wider"
              >
                Sign In / Join →
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </>
  );
}
