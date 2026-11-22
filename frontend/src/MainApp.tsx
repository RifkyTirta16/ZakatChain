import { lazy, Suspense, useState, type ReactNode } from 'react';
import {
  BrowserRouter as Router,
  Link,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import RoleLayout from './components/layout/RoleLayout';
import RequireRole from './components/layout/RequireRole';
import { canAccessPath, rolesForPath, toRole, type SessionUser } from './components/layout/navConfig';
import { queryClient } from './wagmiConfig';
import { Button, Card, Skeleton } from './components/ui';

// Eager Auth & Landing
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import LandingPage from './pages/public/LandingPage';

// Lazy-loaded pages for smaller initial bundle
const ZakatCalculatorPage = lazy(() => import('./pages/public/ZakatCalculatorPage'));
const PublicTransparencyPage = lazy(() => import('./pages/public/PublicTransparencyPage'));
const SandboxPayPage = lazy(() => import('./pages/public/SandboxPayPage'));
const PublicVerify = lazy(() => import('./pages/PublicVerify'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const CampaignDetail = lazy(() => import('./pages/CampaignDetail'));

const DonorHome = lazy(() => import('./pages/home/DonorHome'));
const AmilHome = lazy(() => import('./pages/home/AmilHome'));
const AuditorHome = lazy(() => import('./pages/home/AuditorHome'));
const AdminHome = lazy(() => import('./pages/home/AdminHome'));

const DonationPayment = lazy(() => import('./pages/DonationPayment'));
const MyDonationsPage = lazy(() => import('./pages/muzakki/MyDonationsPage'));
const NewDistributionRecord = lazy(() => import('./pages/NewDistributionRecord'));
const MustahikPage = lazy(() => import('./pages/amil/MustahikPage'));
const PovertyMapping = lazy(() => import('./pages/PovertyMapping'));
const OnChainExplorer = lazy(() => import('./pages/OnChainExplorer'));
const EvidenceGraph = lazy(() => import('./pages/EvidenceGraph'));
const AnomaliesPage = lazy(() => import('./pages/anomalies/AnomaliesPage'));
const ProofsPage = lazy(() => import('./pages/proofs/ProofsPage'));
const ReconciliationPage = lazy(() => import('./pages/reconciliation/ReconciliationPage'));
const AuditPage = lazy(() => import('./pages/audit/AuditPage'));
const ExportPage = lazy(() => import('./pages/export/ExportPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NetworkMonitorPage = lazy(() => import('./pages/admin/NetworkMonitorPage'));
const RolesPermissionsPage = lazy(() => import('./pages/admin/RolesPermissionsPage'));
const ProfilePage = lazy(() => import('./pages/shared/ProfilePage'));

const RouteFallback = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
    <Skeleton lines={3} />
    <Skeleton lines={8} />
  </div>
);

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
    queryClient.clear();
    sessionStorage.removeItem('zakat_manual_logout');
    setUser(userData as SessionUser);
    localStorage.setItem('zakat_user', JSON.stringify(userData));
    localStorage.setItem('zakat_token', authToken);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('zakat_redirect');
    sessionStorage.setItem('zakat_manual_logout', '1');
    setUser(null);
    localStorage.removeItem('zakat_user');
    localStorage.removeItem('zakat_token');
    queryClient.clear();
  };

  const withSuspense = (element: ReactNode) => (
    <Suspense fallback={<RouteFallback />}>{element}</Suspense>
  );

  const guarded = (path: string, element: ReactNode) => (
    <RoleLayout user={user} onLogout={handleLogout}>
      <RequireRole user={user} roles={rolesForPath(path)}>
        {withSuspense(element)}
      </RequireRole>
    </RoleLayout>
  );

  const publicOrWorkspace = (element: ReactNode) => (
    <RoleLayout user={user} onLogout={handleLogout} forcePublicShell={!user}>
      {withSuspense(element)}
    </RoleLayout>
  );

  const alwaysPublic = (element: ReactNode) => (
    <RoleLayout user={user} onLogout={handleLogout} forcePublicShell>
      {withSuspense(element)}
    </RoleLayout>
  );

  const loginRedirectTarget = () => {
    const saved = sessionStorage.getItem('zakat_redirect');
    if (saved) {
      sessionStorage.removeItem('zakat_redirect');
      if (canAccessPath(toRole(user?.role), saved)) {
        return saved;
      }
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
        <Route path="/sandbox/pay/:sessionId" element={alwaysPublic(<SandboxPayPage />)} />

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
        <Route path="/mustahik" element={guarded('/mustahik', <MustahikPage />)} />
        <Route path="/mapping" element={guarded('/mapping', <PovertyMapping />)} />
        <Route path="/explorer" element={guarded('/explorer', <OnChainExplorer />)} />
        <Route path="/graph" element={guarded('/graph', <EvidenceGraph />)} />
        <Route path="/analytics" element={guarded('/analytics', <Dashboard />)} />

        {/* Auditor & Oversight Workspace */}
        <Route path="/anomalies" element={guarded('/anomalies', <AnomaliesPage />)} />
        <Route path="/proofs" element={guarded('/proofs', <ProofsPage />)} />
        <Route path="/reconciliation" element={guarded('/reconciliation', <ReconciliationPage />)} />
        <Route path="/audit" element={guarded('/audit', <AuditPage />)} />
        <Route path="/export" element={guarded('/export', <ExportPage />)} />

        {/* Administrator Monitoring & Governance */}
        <Route path="/network" element={guarded('/network', <NetworkMonitorPage />)} />
        <Route path="/roles" element={guarded('/roles', <RolesPermissionsPage />)} />

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
