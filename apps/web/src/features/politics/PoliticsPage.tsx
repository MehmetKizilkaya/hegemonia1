import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Party, LawProposal, Election } from '@hegemonia/shared';

export function PoliticsPage() {
  const { syncUser } = useAuth();
  const queryClient = useQueryClient();
  const [partyName, setPartyName] = useState('');
  const [lawForm, setLawForm] = useState({ type: 'tax_rate', rate: '15', defenderRegionId: '' });

  const { data: parties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => api.get<Party[]>('/parties'),
  });

  const { data: laws } = useQuery({
    queryKey: ['laws'],
    queryFn: () => api.get<LawProposal[]>('/laws'),
  });

  const { data: elections } = useQuery({
    queryKey: ['elections'],
    queryFn: () => api.get<Election[]>('/elections'),
  });

  const createParty = useMutation({
    mutationFn: (name: string) => api.post('/parties', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      syncUser();
    },
  });

  const joinParty = useMutation({
    mutationFn: (id: string) => api.post(`/parties/${id}/join`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parties'] }),
  });

  const proposeLaw = useMutation({
    mutationFn: () => {
      const payload =
        lawForm.type === 'tax_rate'
          ? { rate: Number(lawForm.rate) }
          : lawForm.type === 'war_declaration'
            ? { defenderRegionId: Number(lawForm.defenderRegionId) }
            : { amount: 1000, partyId: parties?.[0]?.id };
      return api.post('/laws', { type: lawForm.type, payload, regionId: 6 });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['laws'] }),
  });

  const voteLaw = useMutation({
    mutationFn: ({ id, vote }: { id: string; vote: string }) =>
      api.post(`/laws/${id}/vote`, { vote }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['laws'] }),
  });

  const castVote = useMutation({
    mutationFn: ({ electionId, partyId }: { electionId: string; partyId: string }) =>
      api.post('/elections/vote', { electionId, partyId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['elections'] }),
  });

  return (
    <div className="page">
      <h1 className="page-title">Siyaset</h1>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Parti Kur (10.000 HA)</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input placeholder="Parti adı" value={partyName} onChange={(e) => setPartyName(e.target.value)} />
          <button className="btn-primary" onClick={() => createParty.mutate(partyName)} disabled={!partyName || createParty.isPending}>
            Kur
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Partiler</h2>
      <div className="grid-2" style={{ marginBottom: '1rem' }}>
        {parties?.map((p) => (
          <div key={p.id} className="card">
            <strong>{p.name}</strong>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.memberCount} üye</p>
            <button className="btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => joinParty.mutate(p.id)}>
              Katıl
            </button>
          </div>
        ))}
      </div>

      {elections && elections.length > 0 && (
        <>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Seçimler</h2>
          {elections.filter((e) => e.status === 'active').map((e) => (
            <div key={e.id} className="card" style={{ marginBottom: '1rem' }}>
              <p>Aktif seçim — {e.type}</p>
              {parties?.map((p) => (
                <button
                  key={p.id}
                  className="btn-secondary"
                  style={{ width: '100%', marginTop: '0.25rem' }}
                  onClick={() => castVote.mutate({ electionId: e.id, partyId: p.id })}
                >
                  Oy ver: {p.name}
                </button>
              ))}
            </div>
          ))}
        </>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Yasa Teklifi</h3>
        <select value={lawForm.type} onChange={(e) => setLawForm({ ...lawForm, type: e.target.value })} style={{ marginBottom: '0.5rem' }}>
          <option value="tax_rate">Vergi Oranı</option>
          <option value="budget_transfer">Bütçe Transferi</option>
          <option value="war_declaration">Savaş İlanı</option>
        </select>
        {lawForm.type === 'tax_rate' && (
          <input type="number" placeholder="Vergi %" value={lawForm.rate} onChange={(e) => setLawForm({ ...lawForm, rate: e.target.value })} style={{ marginBottom: '0.5rem' }} />
        )}
        {lawForm.type === 'war_declaration' && (
          <input type="number" placeholder="Hedef bölge ID" value={lawForm.defenderRegionId} onChange={(e) => setLawForm({ ...lawForm, defenderRegionId: e.target.value })} style={{ marginBottom: '0.5rem' }} />
        )}
        <button className="btn-primary" style={{ width: '100%' }} onClick={() => proposeLaw.mutate()} disabled={proposeLaw.isPending}>
          Teklif Et
        </button>
      </div>

      <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Yasa Teklifleri</h2>
      <div className="grid-2">
        {laws?.map((l) => (
          <div key={l.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{l.type}</strong>
              <span className={`badge ${l.status === 'voting' ? 'badge-warning' : l.status === 'passed' ? 'badge-success' : ''}`}>{l.status}</span>
            </div>
            <p style={{ fontSize: '0.8rem', margin: '0.5rem 0' }}>
              Pro: {l.proVotes ?? 0} · Contra: {l.contraVotes ?? 0}
            </p>
            {l.status === 'voting' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => voteLaw.mutate({ id: l.id, vote: 'pro' })}>Evet</button>
                <button className="btn-danger" style={{ flex: 1 }} onClick={() => voteLaw.mutate({ id: l.id, vote: 'contra' })}>Hayır</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
