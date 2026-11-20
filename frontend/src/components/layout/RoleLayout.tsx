import type { ReactNode } from 'react';
import PublicShell from './shells/PublicShell';
import MuzakkiShell from './shells/MuzakkiShell';
import AmilShell from './shells/AmilShell';
import AuditorShell from './shells/AuditorShell';
import AdminShell from './shells/AdminShell';
import { toRole, type Role, type SessionUser } from './navConfig';

interface RoleLayoutProps {
  user: SessionUser | null;
  onLogout: () => void;
  forcePublicShell?: boolean;
  children: ReactNode;
}

/**
 * Picks the PublicShell for public website pages or anonymous users,
 * and the role-specific workspace ShellFrame for authenticated dashboard routes.
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
        <MuzakkiShell user={user} onLogout={onLogout}>
          {children}
        </MuzakkiShell>
      );
    case 'AMIL':
      return (
        <AmilShell user={user} onLogout={onLogout}>
          {children}
        </AmilShell>
      );
    case 'AUDITOR':
      return (
        <AuditorShell user={user} onLogout={onLogout}>
          {children}
        </AuditorShell>
      );
    case 'ADMIN':
      return (
        <AdminShell user={user} onLogout={onLogout}>
          {children}
        </AdminShell>
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
