import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import WalletDashboard from './pages/WalletDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('wt_user');
    const token  = localStorage.getItem('wt_token');
    if (stored && token) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!user) {
    return <LoginPage onLogin={(u) => setUser(u)} />;
  }

  if (user.isAdmin) {
    return <AdminPage onLogout={() => setUser(null)} />;
  }

  return <WalletDashboard username={user.username} onLogout={() => setUser(null)} />;
}
