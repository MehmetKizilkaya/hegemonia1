import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';
import type { MarketListing, Item, Region } from '@hegemonia/shared';

interface InventoryRow {
  item: Item;
  quantity: number;
}

export function MarketPage() {
  const { profile, syncUser } = useAuth();
  const queryClient = useQueryClient();
  const [listForm, setListForm] = useState({ itemId: '', quantity: '1', pricePerUnit: '10', regionId: '' });
  const [buyQty, setBuyQty] = useState<Record<string, string>>({});

  const { data: listings } = useQuery({
    queryKey: ['market-listings'],
    queryFn: () => api.get<MarketListing[]>('/market/listings'),
  });

  const { data: inventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get<InventoryRow[]>('/market/inventory'),
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.get<Region[]>('/regions'),
  });

  const createListing = useMutation({
    mutationFn: (body: { regionId: number; itemId: number; quantity: number; pricePerUnit: number }) =>
      api.post('/market/listings', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-listings', 'inventory'] });
      syncUser();
    },
  });

  const buyListing = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      api.post(`/market/listings/${id}/buy`, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-listings', 'inventory'] });
      syncUser();
    },
  });

  return (
    <div className="page">
      <h1 className="page-title">Pazar</h1>

      {inventory && inventory.length > 0 && (
        <>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Envanterim</h2>
          <div className="card" style={{ marginBottom: '1rem' }}>
            {inventory.map((inv) => (
              <div key={inv.item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                <span>{inv.item.name}</span>
                <span style={{ color: 'var(--gold)' }}>{inv.quantity}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Ürün Sat</h3>
        <select
          value={listForm.itemId}
          onChange={(e) => setListForm({ ...listForm, itemId: e.target.value })}
          style={{ marginBottom: '0.5rem' }}
        >
          <option value="">Ürün seçin</option>
          {inventory?.map((inv) => (
            <option key={inv.item.id} value={inv.item.id}>
              {inv.item.name} ({inv.quantity})
            </option>
          ))}
        </select>
        <select
          value={listForm.regionId}
          onChange={(e) => setListForm({ ...listForm, regionId: e.target.value })}
          style={{ marginBottom: '0.5rem' }}
        >
          <option value="">Bölge</option>
          {regions?.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input type="number" placeholder="Miktar" value={listForm.quantity} onChange={(e) => setListForm({ ...listForm, quantity: e.target.value })} />
          <input type="number" placeholder="Birim fiyat (HA)" value={listForm.pricePerUnit} onChange={(e) => setListForm({ ...listForm, pricePerUnit: e.target.value })} />
        </div>
        <button
          className="btn-primary"
          style={{ width: '100%' }}
          disabled={!listForm.itemId || !listForm.regionId || createListing.isPending}
          onClick={() =>
            createListing.mutate({
              regionId: Number(listForm.regionId),
              itemId: Number(listForm.itemId),
              quantity: Number(listForm.quantity),
              pricePerUnit: Number(listForm.pricePerUnit),
            })
          }
        >
          Listele
        </button>
      </div>

      <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Açık İlanlar</h2>
      <div className="grid-2">
        {listings?.length === 0 && <p className="empty-state">Pazar boş</p>}
        {listings?.map((l) => (
          <div key={l.id} className="card">
            <strong>{l.item?.name}</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {l.quantity} adet · {l.pricePerUnit} HA/adet
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="number"
                placeholder="Miktar"
                value={buyQty[l.id] ?? '1'}
                onChange={(e) => setBuyQty({ ...buyQty, [l.id]: e.target.value })}
                style={{ flex: 1 }}
              />
              <button
                className="btn-primary"
                onClick={() => buyListing.mutate({ id: l.id, quantity: Number(buyQty[l.id] ?? 1) })}
                disabled={buyListing.isPending}
              >
                Al
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
