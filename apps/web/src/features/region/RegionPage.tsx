import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Region } from '@hegemonia/shared';
import { useAuth } from '@/features/auth/AuthProvider';

export function RegionPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, syncUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: region, isLoading } = useQuery({
    queryKey: ['region', id],
    queryFn: () => api.get<Region>(`/regions/${id}`),
    enabled: !!id,
  });

  const setResidence = useMutation({
    mutationFn: () => api.post(`/regions/${id}/residence`),
    onSuccess: () => {
      syncUser();
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
  });

  if (isLoading) return <div className="page"><p>Yükleniyor...</p></div>;
  if (!region) return <div className="page"><p>Bölge bulunamadı</p></div>;

  const isResidence = profile?.residenceRegionId === region.id;

  return (
    <div className="page">
      <h1 className="page-title">{region.name}</h1>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nüfus</div>
            <div style={{ fontWeight: 600 }}>{region.population.toLocaleString('tr-TR')}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Savunma</div>
            <div style={{ fontWeight: 600 }}>{region.defensePoints}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Fabrikalar</div>
            <div style={{ fontWeight: 600 }}>{region.factoryCount ?? 0}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Vergi Oranı</div>
            <div style={{ fontWeight: 600 }}>%{(region as Region & { taxRate?: number }).taxRate ?? 10}</div>
          </div>
        </div>
      </div>

      {region.bonuses.length > 0 && (
        <>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Sektör Bonusları</h2>
          <div className="grid-2" style={{ marginBottom: '1rem' }}>
            {region.bonuses.map((b) => (
              <div key={b.sector} className="card">
                <span className="badge badge-success">+{Math.round((b.multiplier - 1) * 100)}%</span>
                <span style={{ marginLeft: '0.5rem', textTransform: 'capitalize' }}>{b.sector}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {!isResidence ? (
        <button
          className="btn-primary"
          style={{ width: '100%' }}
          onClick={() => setResidence.mutate()}
          disabled={setResidence.isPending}
        >
          Buraya İkamet Et
        </button>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--success)' }}>✓ İkamet iliniz</p>
      )}
    </div>
  );
}
