"use client";

/**
 * context/AuthContext.jsx
 *
 * Provides Firebase Authentication state across the app.
 *
 * Flow:
 *   1. Firebase client SDK monitors auth state (onAuthStateChanged).
 *   2. On sign-in, getIdToken() is called and POSTed to /api/auth/session
 *      to exchange for an httpOnly session cookie.
 *   3. On sign-out, DELETE /api/auth/session clears the cookie.
 *   4. All protected API routes verify the session cookie server-side.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);   // Firebase User object | null
  const [loading, setLoading] = useState(true);   // true until first auth check

  // Exchange a fresh ID token for a session cookie
  const mintSession = useCallback(async (firebaseUser) => {
    const idToken = await firebaseUser.getIdToken(/* forceRefresh */ true);
    const res = await fetch("/api/auth/session", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error("Session creation failed");
  }, []);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Auth actions ─────────────────────────────────────────────────────────────

  /** Sign up with email / password */
  const signUp = useCallback(async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    await mintSession(cred.user);
    return cred.user;
  }, [mintSession]);

  /** Sign in with email / password */
  const signIn = useCallback(async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await mintSession(cred.user);
    return cred.user;
  }, [mintSession]);

  /** Sign in with Google popup */
  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await mintSession(cred.user);
    return cred.user;
  }, [mintSession]);

  /** Sign out — clears Firebase auth and server session cookie */
  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    await fetch("/api/auth/session", { method: "DELETE" });
  }, []);

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
