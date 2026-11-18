import { NavLink } from 'react-router-dom';
import { LogOut, Zap } from 'lucide-react';
import { Badge } from '../../ui';
import { itemsForRole, toRole, type SessionUser } from '../navConfig';

interface PublicShellProps {
  user: SessionUser | null;
  onLogout: () => void;
  children: React.ReactNode;
}

/** Donor/public workspace: top navbar, no sidebar, warm cream surfaces. */
const PublicShell = ({ user, onLogout, children }: PublicShellProps) => {
  const role = toRole(user?.role);
  const items = itemsForRole(role);

  return (
    <div className="min-h-screen bg-cream/60 text-primary-dark font-sans pb-16">
      <nav className="bg-white border-b border-primary-bg px-4 md:px-6 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <Zap size={18} />
            </div>
            <span className="font-extrabold tracking-tight text-primary-dark">
              Zakat<span className="text-primary">Chain</span>
            </span>
          </NavLink>

          <div className="hidden md:flex items-center gap-1">
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 min-h-[44px] rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive ? 'bg-primary-bg text-primary-dark' : 'text-primary-dark/70 hover:bg-primary-bg/60'
                  }`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="text-right leading-tight hidden sm:block">
                  <p className="text-sm font-bold text-primary-dark">{user.username || 'Pengguna'}</p>
                  <Badge tone={role ? 'primary' : 'neutral'}>{user.role || 'PENGGUNA'}</Badge>
                </div>
                <button
                  onClick={onLogout}
                  aria-label="Keluar"
                  className="inline-flex items-center min-h-[44px] gap-2 rounded-full px-3 text-sm font-medium text-primary-dark hover:bg-primary-bg outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <LogOut size={16} /> <span className="hidden sm:inline">Keluar</span>
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                className="inline-flex items-center min-h-[44px] rounded-full px-5 bg-gold text-primary-dark font-bold text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Masuk
              </NavLink>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile nav row */}
      <div className="md:hidden bg-white border-b border-primary-bg px-2 py-1 flex gap-1 overflow-x-auto">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium ${
                isActive ? 'bg-primary-bg text-primary-dark' : 'text-primary-dark/70'
              }`
            }
          >
            <item.icon size={14} />
            {item.label}
          </NavLink>
        ))}
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-6">{children}</main>
    </div>
  );
};

export default PublicShell;
