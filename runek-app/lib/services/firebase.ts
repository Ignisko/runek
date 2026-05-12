import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
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

export { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword };
export type { User };

// --- Application CRUD Logic ---

export interface Application {
  id?: string;
  userId: string;
  company: string;
  role: string;
  platform: string;
  link?: string;
  status: 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';
  notes?: string;
  appliedAt: string;
  updatedAt: string;
}

export async function createApplication(appData: Application) {
  const newDocRef = doc(collection(db, "applications"));
  await setDoc(newDocRef, { ...appData, id: newDocRef.id });
  return newDocRef.id;
}

export async function updateApplication(appId: string, updates: Partial<Application>) {
  const docRef = doc(db, "applications", appId);
  await setDoc(docRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteApplication(appId: string) {
  const docRef = doc(db, "applications", appId);
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(docRef);
}
