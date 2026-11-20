import { useState, type ReactNode } from 'react';
import {
  BrowserRouter as Router,
  Link,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import RoleLayout from './components/layout/RoleLayout';
import RequireRole from './components/layout/RequireRole';
import { rolesForPath, toRole, type SessionUser } from './components/layout/navConfig';
import { Button, Card } from './components/ui';

// Auth & Public Pages
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import LandingPage from './pages/public/LandingPage';
import ZakatCalculatorPage from './pages/public/ZakatCalculatorPage';
import PublicTransparencyPage from './pages/public/PublicTransparencyPage';
import PublicVerify from './pages/PublicVerify';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';

// Role Home Dashboards
import DonorHome from './pages/home/DonorHome';
import AmilHome from './pages/home/AmilHome';
import AuditorHome from './pages/home/AuditorHome';
import AdminHome from './pages/home/AdminHome';

// Muzakki, Amil, Auditor & Admin Workspace Pages
import DonationPayment from './pages/DonationPayment';
import MyDonationsPage from './pages/muzakki/MyDonationsPage';
import NewDistributionRecord from './pages/NewDistributionRecord';
import PovertyMapping from './pages/PovertyMapping';
import OnChainExplorer from './pages/OnChainExplorer';
import EvidenceGraph from './pages/EvidenceGraph';
import AnomaliesPage from './pages/anomalies/AnomaliesPage';
import ProofsPage from './pages/proofs/ProofsPage';
import ReconciliationPage from './pages/reconciliation/ReconciliationPage';
import AuditPage from './pages/audit/AuditPage';
import ExportPage from './pages/export/ExportPage';
import Dashboard from './pages/Dashboard';
import NetworkMonitorPage from './pages/admin/NetworkMonitorPage';
import RolesPermissionsPage from './pages/admin/RolesPermissionsPage';
import ProfilePage from './pages/shared/ProfilePage';

const NotFoundPage = ({ isAuthenticated }: { isAuthenticated: boolean }) => (
  <div className="max-w-md mx-auto py-16 px-4">
    <Card className="text-center space-y-4 p-8">
      <p className="text-4xl font-extrabold text-primary">404</p>
      <h1 className="text-xl font-bold text-forest-dark">Halaman Tidak Ditemukan</h1>
      <p className="text-sm text-slate-600">
        Tautan yang Anda buka tidak tersedia atau telah dipindahkan ke struktur menu baru.
      </p>
      <div className="flex justify-center gap-3 pt-2">
        <Link to="/">
          <Button variant="secondary" size="sm">Beranda</Button>
        </Link>
        {isAuthenticated && (
          <Link to="/dashboard">
            <Button variant="primary" size="sm">Ke Dashboard</Button>
          </Link>
        )}
      </div>
    </Card>
  </div>
);

const RoleDashboardSwitch = ({ user }: { user: SessionUser | null }) => {
  switch (toRole(user?.role)) {
    case 'ADMIN':
      return <AdminHome />;
    case 'AUDITOR':
      return <AuditorHome />;
    case 'AMIL':
      return <AmilHome />;
    case 'USER':
    default:
      return <DonorHome user={user} />;
  }
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
    sessionStorage.removeItem('zakat_redirect');
  };

  const guarded = (path: string, element: ReactNode) => (
    <RoleLayout user={user} onLogout={handleLogout}>
      <RequireRole user={user} roles={rolesForPath(path)}>
        {element}
      </RequireRole>
    </RoleLayout>
  );

  const publicOrWorkspace = (element: ReactNode) => (
    <RoleLayout user={user} onLogout={handleLogout} forcePublicShell={!user}>
      {element}
    </RoleLayout>
  );

  const alwaysPublic = (element: ReactNode) => (
    <RoleLayout user={user} onLogout={handleLogout} forcePublicShell>
      {element}
    </RoleLayout>
  );

  const loginRedirectTarget = () => {
    const saved = sessionStorage.getItem('zakat_redirect');
    if (saved) {
      sessionStorage.removeItem('zakat_redirect');
      return saved;
    }
    return '/dashboard';
  };

  return (
    <Router>
      <Routes>
        {/* Public Website Pages */}
        <Route path="/" element={alwaysPublic(<LandingPage />)} />
        <Route path="/transparency" element={alwaysPublic(<PublicTransparencyPage />)} />
        <Route path="/programs" element={publicOrWorkspace(<Campaigns />)} />
        <Route path="/campaigns" element={publicOrWorkspace(<Campaigns />)} />
        <Route path="/campaigns/:id" element={publicOrWorkspace(<CampaignDetail />)} />
        <Route path="/calculator" element={publicOrWorkspace(<ZakatCalculatorPage />)} />
        <Route path="/verify" element={publicOrWorkspace(<PublicVerify />)} />

        {/* Authentication Pages */}
        <Route
          path="/login"
          element={
            user
              ? <Navigate to={loginRedirectTarget()} replace />
              : alwaysPublic(<LoginPage onLoginSuccess={handleLoginSuccess} />)
          }
        />
        <Route
          path="/register"
          element={
            user
              ? <Navigate to="/dashboard" replace />
              : alwaysPublic(<RegisterPage onLoginSuccess={handleLoginSuccess} />)
          }
        />

        {/* Role-Based Dashboard Entry */}
        <Route
          path="/dashboard"
          element={guarded('/dashboard', <RoleDashboardSwitch user={user} />)}
        />

        {/* Muzakki Workspace */}
        <Route path="/donate" element={guarded('/donate', <DonationPayment />)} />
        <Route path="/my-donations" element={guarded('/my-donations', <MyDonationsPage user={user} />)} />

        {/* Amil Operational Workspace */}
        <Route path="/new-record" element={guarded('/new-record', <NewDistributionRecord />)} />
        <Route path="/mapping" element={guarded('/mapping', <PovertyMapping />)} />
        <Route path="/explorer" element={guarded('/explorer', <OnChainExplorer />)} />
        <Route path="/graph" element={guarded('/graph', <EvidenceGraph />)} />

        {/* Auditor & Oversight Workspace */}
        <Route path="/anomalies" element={guarded('/anomalies', <AnomaliesPage />)} />
        <Route path="/proofs" element={guarded('/proofs', <ProofsPage />)} />
        <Route path="/reconciliation" element={guarded('/reconciliation', <ReconciliationPage />)} />
        <Route path="/audit" element={guarded('/audit', <AuditPage />)} />
        <Route path="/export" element={guarded('/export', <ExportPage />)} />

        {/* Administrator Monitoring & Governance */}
        <Route path="/network" element={guarded('/network', <NetworkMonitorPage />)} />
        <Route path="/roles" element={guarded('/roles', <RolesPermissionsPage />)} />
        <Route path="/analytics" element={guarded('/explorer', <Dashboard />)} />

        {/* Shared Profile */}
        <Route
          path="/profile"
          element={guarded('/profile', <ProfilePage user={user} onLogout={handleLogout} />)}
        />

        <Route path="*" element={alwaysPublic(<NotFoundPage isAuthenticated={Boolean(user)} />)} />
      </Routes>
    </Router>
  );
};

export default MainApp;
