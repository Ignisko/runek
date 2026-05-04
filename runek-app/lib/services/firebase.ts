import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, query, getDocs, where } from "firebase/firestore";

// These should be replaced by the USER in their own Firebase Console
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged };
export type { User };

// --- Cloud Sync Logic ---

export async function syncProfileToCloud(userId: string, profile: any) {
  const userDoc = doc(db, "users", userId);
  await setDoc(userDoc, { profile, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function getProfileFromCloud(userId: string) {
  const userDoc = doc(db, "users", userId);
  const snap = await getDoc(userDoc);
  return snap.exists() ? snap.data().profile : null;
}

export async function syncJobToCloud(userId: string, job: any) {
  const jobDoc = doc(db, "users", userId, "jobs", job.id);
  await setDoc(jobDoc, { ...job, updatedAt: new Date().toISOString() });
}

export async function getJobsFromCloud(userId: string) {
  const jobsCol = collection(db, "users", userId, "jobs");
  const snap = await getDocs(jobsCol);
  return snap.docs.map(d => d.data());
}
