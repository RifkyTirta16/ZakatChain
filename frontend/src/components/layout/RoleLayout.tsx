import { lazy, Suspense, type ReactNode } from 'react';
import PublicShell from './shells/PublicShell';
import { Skeleton } from '../ui';
import { toRole, type Role, type SessionUser } from './navConfig';

const MuzakkiShell = lazy(() => import('./shells/MuzakkiShell'));
const AmilShell = lazy(() => import('./shells/AmilShell'));
const AuditorShell = lazy(() => import('./shells/AuditorShell'));
const AdminShell = lazy(() => import('./shells/AdminShell'));

interface RoleLayoutProps {
  user: SessionUser | null;
  onLogout: () => void;
  forcePublicShell?: boolean;
  children: ReactNode;
}

const ShellFallback = () => (
  <div className="min-h-screen bg-cream max-w-7xl mx-auto px-4 py-8">
    <Skeleton lines={8} />
  </div>
);

/**
 * Picks eager PublicShell for public pages/guests and lazy-loads authenticated
 * role shells so initial `/` bundle stays minimal.
 */
const RoleLayout = ({ user, onLogout, forcePublicShell = false, children }: RoleLayoutProps) => {
  if (!user || forcePublicShell) {
    return (
      <PublicShell user={user} onLogout={onLogout}>
        {children}
      </PublicShell>
    );
  }

  const role: Role | null = toRole(user.role);

  switch (role) {
    case 'USER':
      return (
        <Suspense fallback={<ShellFallback />}>
          <MuzakkiShell user={user} onLogout={onLogout}>
            {children}
          </MuzakkiShell>
        </Suspense>
      );
    case 'AMIL':
      return (
        <Suspense fallback={<ShellFallback />}>
          <AmilShell user={user} onLogout={onLogout}>
            {children}
          </AmilShell>
        </Suspense>
      );
    case 'AUDITOR':
      return (
        <Suspense fallback={<ShellFallback />}>
          <AuditorShell user={user} onLogout={onLogout}>
            {children}
          </AuditorShell>
        </Suspense>
      );
    case 'ADMIN':
      return (
        <Suspense fallback={<ShellFallback />}>
          <AdminShell user={user} onLogout={onLogout}>
            {children}
          </AdminShell>
        </Suspense>
      );
    default:
      return (
        <PublicShell user={user} onLogout={onLogout}>
          {children}
        </PublicShell>
      );
  }
};

export default RoleLayout;
