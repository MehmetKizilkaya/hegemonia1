import admin from 'firebase-admin';
import { env, isFirebaseConfigured } from '../config/env.js';

let initialized = false;

export function initFirebase(): void {
  if (initialized || !isFirebaseConfigured()) return;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID!,
      clientEmail: env.FIREBASE_CLIENT_EMAIL!,
      privateKey: env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
  initialized = true;
}

export async function verifyFirebaseToken(token: string): Promise<{ uid: string; email: string }> {
  if (!isFirebaseConfigured()) {
    if (env.DEV_AUTH_BYPASS && token.startsWith('dev:')) {
      const parts = token.slice(4).split(':');
      return { uid: parts[0] ?? 'dev-user', email: parts[1] ?? 'dev@hegemonia.local' };
    }
    throw new Error('Firebase not configured');
  }

  initFirebase();
  const decoded = await admin.auth().verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email ?? `${decoded.uid}@firebase.local` };
}
