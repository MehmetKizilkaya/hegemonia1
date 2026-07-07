import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserProfile, Wallet, AuthSyncResponse } from '@hegemonia/shared';
import { onAuthChange, getIdToken, isConfigured, devSignIn, getDevEmail, devSignOut, logOut } from '@/lib/firebase';
import { api, setTokenGetter } from '@/lib/api';
import type { User } from 'firebase/auth';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  wallet: Wallet | null;
  loading: boolean;
  syncUser: () => Promise<void>;
  signOut: () => Promise<void>;
  devLogin: (email: string) => Promise<void>;
  isDevMode: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);

  async function syncUser() {
    try {
      const data = await api.post<AuthSyncResponse>('/auth/sync');
      setProfile(data.user);
      setWallet(data.wallet);
    } catch (e) {
      console.error('Sync failed:', e);
    }
  }

  useEffect(() => {
    setTokenGetter(getIdToken);

    if (!isConfigured) {
      const devEmail = getDevEmail();
      if (devEmail) {
        devSignIn(devEmail);
        setIsDevMode(true);
        syncUser().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
      return;
    }

    return onAuthChange(async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncUser();
      } else {
        setProfile(null);
        setWallet(null);
      }
      setLoading(false);
    });
  }, []);

  async function signOut() {
    if (isDevMode) {
      devSignOut();
      setIsDevMode(false);
    } else {
      await logOut();
    }
    setProfile(null);
    setWallet(null);
    setFirebaseUser(null);
  }

  async function devLogin(email: string) {
    devSignIn(email);
    setIsDevMode(true);
    await syncUser();
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, wallet, loading, syncUser, signOut, devLogin, isDevMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
