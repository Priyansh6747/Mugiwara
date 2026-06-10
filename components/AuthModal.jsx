"use client";

/**
 * components/AuthModal.jsx
 *
 * Full-screen modal for Sign In / Sign Up.
 * Triggered by the Sidebar when user is not authenticated.
 */

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

// ── Icons ─────────────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const EyeIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    )}
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const SkullIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12,2 C7.5,2 4,5.5 4,10 C4,13 5.5,15.5 8,17 L8,20 C8,21 9,22 10,22 L14,22 C15,22 16,21 16,20 L16,17 C18.5,15.5 20,13 20,10 C20,5.5 16.5,2 12,2 Z"/>
    <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
    <path d="M11,15 L13,15"/>
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuthModal({ onClose }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode]             = useState("signin"); // "signin" | "signup"
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [displayName, setName]      = useState("");
  const [showPassword, setShowPass] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const isSignUp = mode === "signup";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
      onClose();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-void/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      id="auth-modal-backdrop"
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-md mx-4 bg-ash border border-bark rounded-sm shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden"
        style={{ backgroundImage: "var(--wood-grain, none)" }}
        id="auth-modal-panel"
      >
        {/* Decorative top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-blood via-gold to-blood" />

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-bark flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-blood">
              <SkullIcon />
            </span>
            <div>
              <h2 className="font-display text-xl font-black text-parchment tracking-wider">
                {isSignUp ? "Join the Crew" : "Set Sail"}
              </h2>
              <p className="font-meta text-[11px] text-gold tracking-widest mt-0.5">
                {isSignUp ? "Create your navigator's log" : "Continue your voyage"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="auth-modal-close"
            className="text-fog/50 hover:text-parchment transition-colors p-1"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5">
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            id="auth-google-btn"
            className="w-full flex items-center justify-center gap-3 bg-void border border-ink hover:border-fog/40 text-parchment font-ui text-[13px] tracking-wide py-2.5 rounded-sm transition-all hover:bg-void/60 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center gap-4">
            <div className="flex-1 h-px bg-bark" />
            <span className="font-meta text-[11px] text-fog/50 tracking-widest">OR</span>
            <div className="flex-1 h-px bg-bark" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="font-ui text-[11px] text-fog/70 tracking-widest uppercase" htmlFor="auth-name">
                  Crew Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Monkey D. Luffy"
                  autoComplete="name"
                  className="w-full bg-void border border-ink text-parchment placeholder-fog/30 font-ui text-[13px] px-3 py-2.5 rounded-sm focus:outline-none focus:border-blood focus:ring-1 focus:ring-blood/40 transition-all"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-ui text-[11px] text-fog/70 tracking-widest uppercase" htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="luffy@mugiwara.sea"
                autoComplete="email"
                required
                className="w-full bg-void border border-ink text-parchment placeholder-fog/30 font-ui text-[13px] px-3 py-2.5 rounded-sm focus:outline-none focus:border-blood focus:ring-1 focus:ring-blood/40 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-ui text-[11px] text-fog/70 tracking-widest uppercase" htmlFor="auth-password">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  className="w-full bg-void border border-ink text-parchment placeholder-fog/30 font-ui text-[13px] px-3 py-2.5 pr-10 rounded-sm focus:outline-none focus:border-blood focus:ring-1 focus:ring-blood/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  id="auth-toggle-password"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fog/40 hover:text-fog transition-colors"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="font-ui text-xs text-error bg-blood/10 border border-blood/30 px-3 py-2 rounded-sm" id="auth-error-msg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              id="auth-submit-btn"
              className="w-full bg-blood hover:bg-blood/85 text-parchment font-ui text-[13px] font-bold uppercase tracking-widest py-3 rounded-sm transition-all hover:shadow-[0_0_20px_rgba(192,57,43,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Loading…"
                : isSignUp
                ? "Create Account"
                : "Sign In"}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="text-center font-ui text-[12px] text-fog/60">
            {isSignUp ? "Already a crew member?" : "New to the Grand Line?"}{" "}
            <button
              onClick={() => { setMode(isSignUp ? "signin" : "signup"); setError(null); }}
              id="auth-mode-toggle"
              className="text-gold hover:text-parchment transition-colors font-semibold"
            >
              {isSignUp ? "Sign in" : "Join the crew"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Error mapping ─────────────────────────────────────────────────────────────

function friendlyError(code) {
  const map = {
    "auth/user-not-found":        "No crew member found with this email.",
    "auth/wrong-password":        "Wrong password. Check the map again.",
    "auth/email-already-in-use":  "This email is already sailing with us.",
    "auth/weak-password":         "Password must be at least 6 characters.",
    "auth/invalid-email":         "That email doesn't look right.",
    "auth/popup-closed-by-user":  "Sign-in was cancelled.",
    "auth/too-many-requests":     "Too many attempts. Take a breather, captain.",
    "auth/network-request-failed":"Network error. Check your connection.",
    "auth/invalid-credential":    "Invalid credentials. Check your email and password.",
  };
  return map[code] ?? "Something went wrong. Try again.";
}
