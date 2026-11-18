import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import RoleLayout from './components/layout/RoleLayout';
import RequireRole from './components/layout/RequireRole';
import { rolesForPath, toRole, type SessionUser } from './components/layout/navConfig';
import DonorHome from './pages/home/DonorHome';
import AmilHome from './pages/home/AmilHome';
import AuditorHome from './pages/home/AuditorHome';
import AdminHome from './pages/home/AdminHome';

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

  const redirectAfterLogin = sessionStorage.getItem('zakat_redirect');
  if (user && redirectAfterLogin) {
    sessionStorage.removeItem('zakat_redirect');
    return (
      <Router>
        <Navigate to={redirectAfterLogin} replace />
      </Router>
    );
  }

  if (!user) {
    return (
      <Router>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </Router>
    );
  }

  const role = toRole(user.role);
  const Home =
    role === 'AMIL' ? AmilHome
    : role === 'AUDITOR' ? AuditorHome
    : role === 'ADMIN' ? AdminHome
    : DonorHome;

  const guarded = (path: string, element: React.ReactNode) => (
    <RequireRole user={user} roles={rolesForPath(path)}>{element}</RequireRole>
  );

  return (
    <Router>
      <RoleLayout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/campaigns" element={guarded('/campaigns', <Campaigns />)} />
          <Route path="/campaigns/:id" element={guarded('/campaigns', <CampaignDetail />)} />
          <Route path="/donate" element={guarded('/donate', <DonationPayment />)} />
          <Route path="/verify" element={guarded('/verify', <PublicVerify />)} />
          <Route path="/new-record" element={guarded('/new-record', <NewDistributionRecord />)} />
          <Route path="/mapping" element={guarded('/mapping', <PovertyMapping />)} />
          <Route path="/explorer" element={guarded('/explorer', <OnChainExplorer />)} />
          <Route path="/graph" element={guarded('/graph', <EvidenceGraph />)} />
          <Route path="/dashboard" element={guarded('/', <Dashboard />)} />
          <Route
            path="/anomalies"
            element={guarded('/anomalies', <PlaceholderPage title="Anomali" />)}
          />
          <Route
            path="/proofs"
            element={guarded('/proofs', <PlaceholderPage title="Verifikasi Bukti" />)}
          />
          <Route
            path="/reconciliation"
            element={guarded('/reconciliation', <PlaceholderPage title="Rekonsiliasi" />)}
          />
          <Route path="/audit" element={guarded('/audit', <PlaceholderPage title="Log Audit" />)} />
          <Route path="/export" element={guarded('/export', <PlaceholderPage title="Ekspor" />)} />
          <Route path="*" element={<PlaceholderPage title="Halaman" />} />
        </Routes>
      </RoleLayout>
    </Router>
  );
};

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="max-w-md mx-auto text-center py-16">
    <h1 className="text-2xl font-extrabold text-primary-dark mb-2">{title}</h1>
    <p className="text-primary-dark/70">
      Menu ini ada di konfigurasi peran Anda; halaman kerjanya akan menyambung ke backend
      pada iterasi berikutnya.
    </p>
  </div>
);

export default MainApp;
