/**
 * lib/firebaseAdmin.js
 * Server-side Firebase Admin SDK singleton.
 * NEVER import this in client components — it uses secret credentials.
 *
 * Usage:
 *   import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth }      from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // The private key in .env has literal \n — replace them with real newlines
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminApp  = getAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb   = getFirestore(adminApp);

export { adminAuth, adminDb };
