"use client";

/**
 * components/UserBadge.jsx
 *
 * Shown in the homepage header.
 * Displays user avatar + name when signed in, or a Sign In button when not.
 */

import { useState } from "react";
import { useAuth }  from "@/context/AuthContext";
import AuthModal    from "@/components/AuthModal";

export default function UserBadge() {
  const { user, loading, signOut } = useAuth();
  const [showModal, setShowModal]  = useState(false);
  const [menuOpen, setMenuOpen]    = useState(false);

  if (loading) {
    return (
      <div className="w-32 h-9 rounded-sm bg-bark/40 animate-pulse" id="user-badge-skeleton" />
    );
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          id="header-signin-btn"
          className="flex items-center gap-2 bg-bark/30 border border-ink hover:border-blood px-4 py-1.5 rounded-sm bg-noise transition-all group"
        >
          <div className="w-7 h-7 rounded-full border border-fog/30 bg-void flex items-center justify-center text-xs select-none text-fog/50 group-hover:border-blood group-hover:text-blood transition-colors">
            ☠️
          </div>
          <div className="text-right">
            <div className="font-ui text-xs font-semibold text-fog/70 group-hover:text-parchment transition-colors leading-tight">Sign In</div>
            <div className="font-meta text-[10px] text-fog/40 tracking-wider leading-none mt-0.5">Join the crew</div>
          </div>
        </button>
        {showModal && <AuthModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  const initials = (user.displayName ?? user.email ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        id="header-user-btn"
        className="flex items-center gap-2 bg-bark/30 border border-ink hover:border-gold px-3 py-1.5 rounded-sm bg-noise transition-all"
      >
        <div className="text-right">
          <div className="font-ui text-xs font-semibold text-parchment leading-tight truncate max-w-[100px]">
            {user.displayName ?? "Crew Member"}
          </div>
        </div>
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full border border-gold object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full border border-gold bg-blood/20 flex items-center justify-center font-ui text-[10px] font-bold text-gold select-none">
            {initials}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 w-44 bg-ash border border-bark rounded-sm shadow-xl overflow-hidden">
            <div className="px-3 py-2.5 border-b border-bark">
              <p className="font-ui text-[11px] text-fog/50 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { signOut(); setMenuOpen(false); }}
              id="header-signout-btn"
              className="w-full text-left px-3 py-2.5 font-ui text-[12px] text-fog/70 hover:text-blood hover:bg-blood/5 transition-all"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
