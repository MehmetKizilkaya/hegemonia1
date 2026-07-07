import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { LoginPage } from '@/features/auth/LoginPage';
import { Layout } from '@/components/Layout';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { MapPage } from '@/features/map/MapPage';
import { RegionPage } from '@/features/region/RegionPage';
import { EconomyPage } from '@/features/economy/EconomyPage';
import { MarketPage } from '@/features/market/MarketPage';
import { PoliticsPage } from '@/features/politics/PoliticsPage';
import { WarPage } from '@/features/war/WarPage';
import { ChatPage } from '@/features/chat/ChatPage';
import { NotificationBell } from '@/features/profile/NotificationBell';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

function ProtectedRoutes() {
  const { profile, loading, isDevMode } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Yükleniyor...
      </div>
    );
  }

  if (!profile && !isDevMode) {
    return <LoginPage />;
  }

  if (!profile) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <NotificationBell />
      <Routes>
        <Route path="/" element={<ProfilePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/region/:id" element={<RegionPage />} />
        <Route path="/economy" element={<EconomyPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/politics" element={<PoliticsPage />} />
        <Route path="/war" element={<WarPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ProtectedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
