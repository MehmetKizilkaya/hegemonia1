import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Factory, FactoryType, JobPosting, Recipe } from '@hegemonia/shared';
import type { Region } from '@hegemonia/shared';

export function EconomyPage() {
  const { profile, syncUser } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'factories' | 'jobs' | 'build'>('factories');
  const [buildForm, setBuildForm] = useState({ regionId: '', factoryTypeId: '' });

  const { data: factories } = useQuery({
    queryKey: ['my-factories'],
    queryFn: () => api.get<Factory[]>('/factories/mine'),
  });

  const { data: factoryTypes } = useQuery({
    queryKey: ['factory-types'],
    queryFn: () => api.get<FactoryType[]>('/factory-types'),
  });

  const { data: recipes } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => api.get<Recipe[]>('/recipes'),
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.get<(JobPosting & { factory: Factory })[]>('/jobs'),
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.get<Region[]>('/regions'),
  });

  const buildFactory = useMutation({
    mutationFn: (body: { regionId: number; factoryTypeId: number }) =>
      api.post('/factories/build', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-factories'] });
      syncUser();
      setTab('factories');
    },
  });

  const applyJob = useMutation({
    mutationFn: (id: string) => api.post(`/jobs/${id}/apply`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const workShift = useMutation({
    mutationFn: (factoryId: string) => api.post(`/factories/${factoryId}/work`),
    onSuccess: () => syncUser(),
  });

  const startProduction = useMutation({
    mutationFn: ({ factoryId, recipeId }: { factoryId: string; recipeId: number }) =>
      api.post(`/factories/${factoryId}/produce`, { recipeId, quantity: 1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-factories'] }),
  });

  const subTabs = [
    { key: 'factories' as const, label: 'Fabrikalarım' },
    { key: 'jobs' as const, label: 'İş İlanları' },
    { key: 'build' as const, label: 'Fabrika Kur' },
  ];

  return (
    <div className="page">
      <h1 className="page-title">Ekonomi</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {subTabs.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'factories' && (
        <div className="grid-2">
          {factories?.length === 0 && <p className="empty-state">Henüz fabrikanız yok</p>}
          {factories?.map((f) => (
            <div key={f.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>{(f as Factory & { factoryType?: FactoryType }).factoryType?.name ?? 'Fabrika'}</strong>
                <span className={`badge ${f.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{f.status}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {(f as Factory & { regionName?: string }).regionName} · Sv.{f.level} · {f.activeWorkers} işçi
              </p>
              {f.status === 'active' && recipes && (
                <div style={{ marginTop: '0.75rem' }}>
                  {recipes
                    .filter((r) => r.factoryTypeId === f.factoryTypeId)
                    .map((r) => (
                      <button
                        key={r.id}
                        className="btn-secondary"
                        style={{ width: '100%', marginTop: '0.25rem', fontSize: '0.8rem' }}
                        onClick={() => startProduction.mutate({ factoryId: f.id, recipeId: r.id })}
                        disabled={startProduction.isPending}
                      >
                        Üret: {r.outputItem?.name ?? `Reçete #${r.id}`}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'jobs' && (
        <div className="grid-2">
          {jobs?.length === 0 && <p className="empty-state">Açık iş ilanı yok</p>}
          {jobs?.map((j) => (
            <div key={j.id} className="card">
              <strong>{j.factory?.factoryType?.name}</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>
                {(j.factory as Factory & { regionName?: string })?.regionName}
              </p>
              <p style={{ color: 'var(--gold)', fontWeight: 600 }}>{j.salaryPerShift} HA / vardiya</p>
              <button
                className="btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                onClick={() => applyJob.mutate(j.id)}
                disabled={applyJob.isPending}
              >
                Başvur
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'build' && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Yeni Fabrika Kur</h3>
          <select
            value={buildForm.regionId}
            onChange={(e) => setBuildForm({ ...buildForm, regionId: e.target.value })}
            style={{ marginBottom: '0.5rem' }}
          >
            <option value="">İl seçin</option>
            {regions?.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select
            value={buildForm.factoryTypeId}
            onChange={(e) => setBuildForm({ ...buildForm, factoryTypeId: e.target.value })}
            style={{ marginBottom: '0.75rem' }}
          >
            <option value="">Fabrika tipi seçin</option>
            {factoryTypes?.map((ft) => (
              <option key={ft.id} value={ft.id}>{ft.name} — {ft.buildCost} HA</option>
            ))}
          </select>
          <button
            className="btn-primary"
            style={{ width: '100%' }}
            disabled={!buildForm.regionId || !buildForm.factoryTypeId || buildFactory.isPending}
            onClick={() =>
              buildFactory.mutate({
                regionId: Number(buildForm.regionId),
                factoryTypeId: Number(buildForm.factoryTypeId),
              })
            }
          >
            İnşaata Başla
          </button>
          {buildFactory.isError && (
            <p style={{ color: 'var(--danger)', marginTop: '0.5rem', fontSize: '0.85rem' }}>
              {(buildFactory.error as Error).message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
