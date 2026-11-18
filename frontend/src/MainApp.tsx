import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Zap, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import PovertyMapping from './pages/PovertyMapping';
import OnChainExplorer from './pages/OnChainExplorer';
import DonationPayment from './pages/DonationPayment';
import NewDistributionRecord from './pages/NewDistributionRecord';
import LoginPage from './components/auth/LoginPage';
import PublicVerify from './pages/PublicVerify';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import EvidenceGraph from './pages/EvidenceGraph';

interface SessionUser {
  id?: number;
  username?: string;
  role?: string;
}

const Navigation = ({ user, onLogout }: { user: SessionUser; onLogout: () => void }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Pemetaan Wilayah', path: '/mapping' },
    { name: 'Campaigns', path: '/campaigns' },
    { name: 'Evidence Graph', path: '/graph' },
    { name: 'Explorer', path: '/explorer' },
    { name: 'Donasi', path: '/donate' },
    { name: 'Input Distribusi', path: '/new-record' },
    { name: 'Verifikasi', path: '/verify' },
  ];

  return (
    <nav className="bg-wattvision-surface border-b border-wattvision-border px-4 md:px-6 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-wattvision-primary rounded-lg flex items-center justify-center text-black shadow-lg shadow-cyan-500/20">
              <Zap size={18} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tighter uppercase italic leading-none">
                Zakat<span className="text-wattvision-primary">Chain</span>
              </span>
              <span className="text-[9px] text-wattvision-textSecondary uppercase tracking-widest font-medium">
                Institutional Audit System
              </span>
            </div>
          </Link>
          <button
            onClick={onLogout}
            className="flex md:hidden items-center gap-2 text-xs uppercase tracking-widest font-bold text-wattvision-textSecondary hover:text-white transition-colors"
          >
            <LogOut size={16} /> Keluar
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0 -mx-1 px-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all duration-200 whitespace-nowrap ${
                location.pathname === item.path
                  ? 'bg-wattvision-primary text-black'
                  : 'text-wattvision-textSecondary hover:bg-wattvision-border hover:text-white'
              }`}
            >
              {item.name}
            </Link>
          ))}
          <div className="hidden md:flex items-center gap-3 ml-2 pl-4 border-l border-wattvision-border">
            <div className="text-right leading-tight">
              <p className="text-[11px] font-bold text-white">{user.username || 'Pengguna'}</p>
              <p className="text-[9px] uppercase tracking-widest text-wattvision-textSecondary font-mono">{user.role || ''}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-wattvision-textSecondary hover:text-white transition-colors"
              aria-label="Keluar"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const MainApp = () => {
  const [user, setUser] = useState<SessionUser | null>(() => {
    const storedUser = localStorage.getItem('zakat_user');
    const storedToken = localStorage.getItem('zakat_token');
    if (storedUser && storedToken) {
      try {
        return JSON.parse(storedUser) as SessionUser;
      } catch {
        localStorage.removeItem('zakat_user');
        localStorage.removeItem('zakat_token');
      }
    }
    return null;
  });

  const handleLoginSuccess = (userData: unknown, authToken: string) => {
    setUser(userData as SessionUser);
    localStorage.setItem('zakat_user', JSON.stringify(userData));
    localStorage.setItem('zakat_token', authToken);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('zakat_user');
    localStorage.removeItem('zakat_token');
  };

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-wattvision-bg text-wattvision-textMain font-sans">
        <Navigation user={user} onLogout={handleLogout} />
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mapping" element={<PovertyMapping />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/graph" element={<EvidenceGraph />} />
            <Route path="/explorer" element={<OnChainExplorer />} />
            <Route path="/donate" element={<DonationPayment />} />
            <Route path="/new-record" element={<NewDistributionRecord />} />
            <Route path="/verify" element={<PublicVerify />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default MainApp;
