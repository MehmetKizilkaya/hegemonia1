import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isConfigured } from '@/lib/firebase';
import { useAuth } from '@/features/auth/AuthProvider';

interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: { seconds: number } | null;
}

const CHANNELS = [
  { id: 'global', label: 'Global' },
  { id: 'trade', label: 'Ticaret' },
  { id: 'politics', label: 'Siyaset' },
];

export function ChatPage() {
  const { profile, firebaseUser, isDevMode } = useAuth();
  const [channel, setChannel] = useState('global');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const userId = firebaseUser?.uid ?? (isDevMode ? `dev-${profile?.email}` : '');
  const displayName = profile?.displayName ?? 'Anonim';

  useEffect(() => {
    if (!isConfigured || !db) return;

    const q = query(
      collection(db, 'channels', channel, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50),
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
      setMessages(msgs.reverse());
    });

    return unsub;
  }, [channel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !db || !userId) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'channels', channel, 'messages'), {
        userId,
        displayName,
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      setText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  if (!isConfigured) {
    return (
      <div className="page">
        <h1 className="page-title">Sohbet</h1>
        <div className="card empty-state">
          <p>Firebase yapılandırılmamış</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Sohbet için Firebase Firestore yapılandırması gerekli.
            Geliştirme modunda diğer özellikler çalışmaya devam eder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <h1 className="page-title">Sohbet</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            className={channel === c.id ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setChannel(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ flex: 1, overflow: 'auto', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {messages.length === 0 && <p className="empty-state">Henüz mesaj yok</p>}
        {messages.map((m) => (
          <div key={m.id}>
            <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem' }}>{m.displayName}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
              {m.createdAt ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString('tr-TR') : ''}
            </span>
            <p style={{ fontSize: '0.9rem' }}>{m.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mesaj yaz..."
          maxLength={500}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-primary" disabled={sending || !text.trim()}>
          Gönder
        </button>
      </form>
    </div>
  );
}
