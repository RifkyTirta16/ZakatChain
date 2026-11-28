import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Card, Skeleton } from '../ui';
import { ROLE_LABELS, toRole, type Role, type SessionUser } from './navConfig';

interface RequireRoleProps {
  user: SessionUser | null;
  roles: Role[];
  isHydrating?: boolean;
  children: ReactNode;
}

/** Redirects anonymous users to /login (preserving destination) and shows a clear 403 for unauthorized roles. */
const RequireRole = ({ user, roles, isHydrating = false, children }: RequireRoleProps) => {
  const location = useLocation();

  if (isHydrating && !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Skeleton lines={6} />
      </div>
    );
  }

  if (!user) {
    if (sessionStorage.getItem('zakat_manual_logout') === '1') {
      sessionStorage.removeItem('zakat_manual_logout');
    } else {
      sessionStorage.setItem('zakat_redirect', `${location.pathname}${location.search}`);
    }
    return <Navigate to="/login" replace />;
  }

  const role = toRole(user.role);
  const allowed = roles.length === 0 || (role !== null && roles.includes(role));

  if (!allowed) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <Card variant="anomaly" className="text-center space-y-4 p-8">
          <div className="w-12 h-12 rounded-xl bg-red-100 text-danger flex items-center justify-center mx-auto">
            <ShieldAlert size={24} />
          </div>
          <h1 className="text-2xl font-extrabold text-forest-dark">Akses Dibatasi (403)</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Menu ini tidak tersedia untuk peran Anda (<strong>{role ? ROLE_LABELS[role] : (user.role || 'Tanpa Peran')}</strong>).
            Gunakan menu di navigasi sesuai hak akses Anda atau hubungi Administrator.
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center min-h-[44px] rounded-[10px] bg-primary px-5 text-white font-semibold text-sm hover:bg-forest"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireRole;
