import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Notification } from '@hegemonia/shared';

export function NotificationBell() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications'),
    enabled: !!profile,
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifications?.filter((n) => !n.read) ?? [];

  if (!profile || unread.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--accent)' }}>
      <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Bildirimler ({unread.length})</h3>
      {unread.slice(0, 3).map((n) => (
        <div
          key={n.id}
          style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
          onClick={() => markRead.mutate(n.id)}
        >
          <strong style={{ fontSize: '0.85rem' }}>{n.title}</strong>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{n.body}</p>
        </div>
      ))}
    </div>
  );
}
