import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { getSocket } from '@/lib/socket';
import type { War } from '@hegemonia/shared';

export function WarPage() {
  const { syncUser } = useAuth();
  const [selectedWar, setSelectedWar] = useState<string | null>(null);
  const [liveWar, setLiveWar] = useState<War | null>(null);

  const { data: wars, refetch } = useQuery({
    queryKey: ['wars'],
    queryFn: () => api.get<War[]>('/wars'),
    refetchInterval: 10000,
  });

  const attack = useMutation({
    mutationFn: (warId: string) => api.post(`/wars/${warId}/attack`, { energySpent: 5 }),
    onSuccess: () => {
      syncUser();
      refetch();
    },
  });

  const defend = useMutation({
    mutationFn: (warId: string) => api.post(`/wars/${warId}/defend`, { energySpent: 5 }),
    onSuccess: () => {
      syncUser();
      refetch();
    },
  });

  useEffect(() => {
    if (!selectedWar) return;

    getSocket().then((socket) => {
      socket.emit('join:war', selectedWar);
      socket.on('war:update', (data: War) => {
        setLiveWar(data);
      });
    });
  }, [selectedWar]);

  const activeWars = wars?.filter((w) => w.status === 'active') ?? [];
  const displayWar = liveWar ?? activeWars.find((w) => w.id === selectedWar) ?? activeWars[0];

  useEffect(() => {
    if (activeWars.length > 0 && !selectedWar) {
      setSelectedWar(activeWars[0].id);
    }
  }, [activeWars, selectedWar]);

  return (
    <div className="page">
      <h1 className="page-title">Savaş</h1>

      {activeWars.length === 0 ? (
        <div className="empty-state">
          <p>Aktif savaş yok</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Meclisten savaş ilanı geçirilerek savaş başlatılabilir
          </p>
        </div>
      ) : (
        <>
          {activeWars.length > 1 && (
            <select
              value={selectedWar ?? ''}
              onChange={(e) => setSelectedWar(e.target.value)}
              style={{ marginBottom: '1rem' }}
            >
              {activeWars.map((w) => (
                <option key={w.id} value={w.id}>
                  {(w as War & { defenderRegion?: { name: string } }).defenderRegion?.name ?? `Savaş ${w.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
          )}

          {displayWar && (
            <div className="card">
              <h2 style={{ marginBottom: '1rem' }}>
                {(displayWar as War & { defenderRegion?: { name: string } }).defenderRegion?.name ?? 'Cephe'}
              </h2>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--danger)' }}>Saldırı: {displayWar.attackerDamage}</span>
                  <span style={{ color: 'var(--accent)' }}>Savunma: {displayWar.defenderDamage}</span>
                </div>
                <div className="stat-bar">
                  <div
                    className="stat-bar-fill stat-bar-hp"
                    style={{
                      width: `${(displayWar.attackerDamage / (displayWar.attackerDamage + displayWar.defenderDamage + 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Saatte 1 ücretsiz saldırı · Sonra 5 enerji
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  className="btn-danger"
                  onClick={() => attack.mutate(displayWar.id)}
                  disabled={attack.isPending}
                >
                  Saldır (5⚡)
                </button>
                <button
                  className="btn-primary"
                  onClick={() => defend.mutate(displayWar.id)}
                  disabled={defend.isPending}
                >
                  Savun (5⚡)
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
