import { useAuth } from '@/features/auth/AuthProvider';
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Profil' },
  { to: '/map', label: 'Harita' },
  { to: '/economy', label: 'Ekonomi' },
  { to: '/market', label: 'Pazar' },
  { to: '/politics', label: 'Siyaset' },
  { to: '/war', label: 'Savaş' },
  { to: '/chat', label: 'Sohbet' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, wallet } = useAuth();

  return (
    <div>
      <header style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '0.5rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Hegemonia</span>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.85rem' }}>
          <span className="badge badge-gold">{wallet?.balance ?? 0} HA</span>
          <span style={{ color: 'var(--energy)' }}>⚡ {profile?.energy ?? 0}/{profile?.maxEnergy ?? 20}</span>
        </div>
      </header>

      <main>{children}</main>

      <nav className="tabs" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} end={tab.to === '/'}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
