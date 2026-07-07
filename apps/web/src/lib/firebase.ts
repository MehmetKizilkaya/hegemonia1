import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your-api-key';

let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db, isConfigured };

export async function signInGoogle() {
  if (!auth) throw new Error('Firebase yapılandırılmamış');
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signInEmail(email: string, password: string) {
  if (!auth) throw new Error('Firebase yapılandırılmamış');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpEmail(email: string, password: string) {
  if (!auth) throw new Error('Firebase yapılandırılmamış');
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logOut() {
  if (auth) await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string | null> {
  if (!auth?.currentUser) {
    const devToken = localStorage.getItem('hegemonia_dev_token');
    return devToken;
  }
  return auth.currentUser.getIdToken();
}

export function devSignIn(email: string) {
  const uid = `dev-${email.replace(/[^a-z0-9]/gi, '-')}`;
  const token = `dev:${uid}:${email}`;
  localStorage.setItem('hegemonia_dev_token', token);
  localStorage.setItem('hegemonia_dev_email', email);
  return token;
}

export function devSignOut() {
  localStorage.removeItem('hegemonia_dev_token');
  localStorage.removeItem('hegemonia_dev_email');
}

export function getDevEmail(): string | null {
  return localStorage.getItem('hegemonia_dev_email');
}
