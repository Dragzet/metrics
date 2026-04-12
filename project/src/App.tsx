import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SensorsPage from './pages/SensorsPage';
import ReadingsPage from './pages/ReadingsPage';
import UsersPage from './pages/UsersPage';
import Sidebar from './components/Sidebar';
import { Activity } from 'lucide-react';

type Page = 'dashboard' | 'sensors' | 'readings' | 'users';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400">
          <Activity className="w-5 h-5 animate-pulse" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const safePage: Page =
    currentPage === 'users' && user.role !== 'admin' ? 'dashboard' : currentPage;

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <Sidebar currentPage={safePage} onNavigate={setCurrentPage} />
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {safePage === 'dashboard' && <DashboardPage />}
        {safePage === 'sensors' && <SensorsPage />}
        {safePage === 'readings' && <ReadingsPage />}
        {safePage === 'users' && user.role === 'admin' && <UsersPage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
