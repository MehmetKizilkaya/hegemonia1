import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { signInGoogle, signInEmail, signUpEmail, isConfigured } from '@/lib/firebase';

export function LoginPage() {
  const { devLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await signUpEmail(email, password);
      } else {
        await signInEmail(email, password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      await signInGoogle();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDevLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await devLogin(email);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '0.25rem', textAlign: 'center' }}>Hegemonia</h1>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Ekonomi · Siyaset · Savaş
        </p>

        {isConfigured ? (
          <>
            <button className="btn-primary" style={{ width: '100%', marginBottom: '1rem' }} onClick={handleGoogle} disabled={loading}>
              Google ile Giriş
            </button>

            <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '0.75rem 0', fontSize: '0.85rem' }}>veya</div>

            <form onSubmit={handleEmailAuth}>
              <input type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: '0.5rem' }} required />
              <input type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: '0.75rem' }} required />
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                {isRegister ? 'Kayıt Ol' : 'Giriş Yap'}
              </button>
            </form>

            <button
              className="btn-secondary"
              style={{ width: '100%', marginTop: '0.5rem', background: 'transparent', border: 'none', color: 'var(--accent)' }}
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? 'Zaten hesabın var mı? Giriş yap' : 'Hesap oluştur'}
            </button>
          </>
        ) : (
          <form onSubmit={handleDevLogin}>
            <p style={{ color: 'var(--warning)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Firebase yapılandırılmamış — Geliştirme modu aktif
            </p>
            <input type="email" placeholder="E-posta (dev)" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: '0.75rem' }} required />
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              Dev Girişi
            </button>
          </form>
        )}

        {error && <p style={{ color: 'var(--danger)', marginTop: '1rem', fontSize: '0.85rem' }}>{error}</p>}
      </div>
    </div>
  );
}
