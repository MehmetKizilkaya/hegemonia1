import { useAuth } from '@/features/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Region, DailyQuest } from '@hegemonia/shared';

export function ProfilePage() {
  const { profile, wallet, signOut } = useAuth();

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.get<Region[]>('/regions'),
  });

  const { data: quests } = useQuery({
    queryKey: ['daily-quests'],
    queryFn: () => api.get<DailyQuest[]>('/quests/daily'),
  });

  const residence = regions?.find((r) => r.id === profile?.residenceRegionId);

  if (!profile) return null;

  const energyPct = (profile.energy / profile.maxEnergy) * 100;

  return (
    <div className="page">
      <h1 className="page-title">Profil</h1>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem' }}>{profile.displayName}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{profile.email}</p>
          </div>
          <span className="badge badge-gold">Sv. {profile.level}</span>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            <span>Enerji</span>
            <span>{profile.energy} / {profile.maxEnergy}</span>
          </div>
          <div className="stat-bar">
            <div className="stat-bar-fill stat-bar-energy" style={{ width: `${energyPct}%` }} />
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Bakiye</div>
            <div style={{ fontSize: '1.2rem', color: 'var(--gold)', fontWeight: 700 }}>{wallet?.balance ?? 0} HA</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>İkamet</div>
            <div style={{ fontWeight: 600 }}>{residence?.name ?? 'Seçilmedi'}</div>
          </div>
        </div>
      </div>

      {quests && quests.length > 0 && (
        <>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Günlük Görevler</h2>
          <div className="grid-2" style={{ marginBottom: '1rem' }}>
            {quests.map((q) => (
              <div key={q.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{q.title}</strong>
                  {q.completed && <span className="badge badge-success">Tamam</span>}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{q.description}</p>
                <div className="stat-bar">
                  <div className="stat-bar-fill" style={{ width: `${(q.progress / q.target) * 100}%`, background: 'var(--success)' }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {q.progress}/{q.target} · +{q.rewardGold} HA
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <button className="btn-secondary" onClick={signOut} style={{ width: '100%' }}>
        Çıkış Yap
      </button>
    </div>
  );
}
