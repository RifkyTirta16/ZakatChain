import type { ReactNode } from 'react';
import PublicShell from './shells/PublicShell';
import AmilShell from './shells/AmilShell';
import AuditorShell from './shells/AuditorShell';
import AdminShell from './shells/AdminShell';
import { toRole, type Role, type SessionUser } from './navConfig';

interface RoleLayoutProps {
  user: SessionUser | null;
  onLogout: () => void;
  children: ReactNode;
}

/** Picks the workspace shell for the current role; one set of ui/ inside. */
const RoleLayout = ({ user, onLogout, children }: RoleLayoutProps) => {
  const role: Role | null = user ? toRole(user.role) : null;

  switch (role) {
    case 'AMIL':
      return (
        <AmilShell user={user as SessionUser} onLogout={onLogout}>
          {children}
        </AmilShell>
      );
    case 'AUDITOR':
      return (
        <AuditorShell user={user as SessionUser} onLogout={onLogout}>
          {children}
        </AuditorShell>
      );
    case 'ADMIN':
      return (
        <AdminShell user={user as SessionUser} onLogout={onLogout}>
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
