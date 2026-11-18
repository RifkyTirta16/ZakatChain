import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { toRole, type Role, type SessionUser } from './navConfig';

interface RequireRoleProps {
  user: SessionUser | null;
  roles: Role[];
  children: ReactNode;
}

/** Redirects anonymous users to login (remembering the target) and shows a friendly 403 for wrong roles. */
const RequireRole = ({ user, roles, children }: RequireRoleProps) => {
  const location = useLocation();

  if (!user) {
    sessionStorage.setItem('zakat_redirect', location.pathname);
    return <Navigate to="/" replace />;
  }

  const role = toRole(user.role);
  // Empty roles array = public item, accessible to every signed-in role.
  const allowed = roles.length === 0 || (role !== null && roles.includes(role));
  if (!allowed) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <ShieldAlert size={48} className="mx-auto text-coral mb-4" />
        <h1 className="text-2xl font-extrabold text-primary-dark mb-2">403</h1>
        <p className="text-primary-dark/70 mb-6">
          Menu ini tidak tersedia untuk peran Anda ({user.role || 'tanpa peran'}). Bila Anda
          membutuhkan akses, hubungi administrator ZakatChain.
        </p>
        <Link
          to="/"
          className="inline-flex items-center min-h-[44px] rounded-full bg-primary px-6 text-white font-bold text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Kembali ke halaman awal
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireRole;
