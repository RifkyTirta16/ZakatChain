import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogOut, Menu, X, Zap } from 'lucide-react';
import { Badge } from '../../ui';
import { itemsForRole, toRole, type Role, type SessionUser } from '../navConfig';

export type ShellTheme = 'public' | 'amil' | 'auditor' | 'admin';

interface ThemeSpec {
  sidebarBg: string;
  brandText: string;
  brandSub: string;
  itemBase: string;
  itemActive: string;
  mobileBarBg: string;
  padding: string;
}

const THEMES: Record<Exclude<ShellTheme, 'public'>, ThemeSpec> = {
  amil: {
    sidebarBg: 'bg-primary text-white',
    brandText: 'text-white',
    brandSub: 'text-white/70',
    itemBase: 'text-white/80 hover:bg-white/10 hover:text-white',
    itemActive: 'bg-white/20 text-white',
    mobileBarBg: 'bg-primary text-white',
    padding: 'px-4 py-2.5 text-sm',
  },
  auditor: {
    sidebarBg: 'bg-slate-900 text-slate-100',
    brandText: 'text-white',
    brandSub: 'text-slate-400',
    itemBase: 'text-slate-300 hover:bg-slate-800 hover:text-white',
    itemActive: 'bg-sky/20 text-sky-200',
    mobileBarBg: 'bg-slate-900 text-slate-100',
    padding: 'px-2.5 py-1.5 text-xs',
  },
  admin: {
    sidebarBg: 'bg-primary-dark text-white',
    brandText: 'text-white',
    brandSub: 'text-white/70',
    itemBase: 'text-white/80 hover:bg-white/10 hover:text-white',
    itemActive: 'bg-white/20 text-white',
    mobileBarBg: 'bg-primary-dark text-white',
    padding: 'px-4 py-2.5 text-sm',
  },
};

const ROLE_BADGE_TONE: Record<Role, 'primary' | 'neutral'> = {
  USER: 'neutral',
  AMIL: 'primary',
  AUDITOR: 'primary',
  ADMIN: 'primary',
};

interface ShellFrameProps {
  theme: Exclude<ShellTheme, 'public'>;
  user: SessionUser;
  onLogout: () => void;
  children: ReactNode;
}

/** Shared chrome for role workspaces: one component, role only changes the theme. */
const ShellFrame = ({ theme, user, onLogout, children }: ShellFrameProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const spec = THEMES[theme];
  const items = itemsForRole(toRole(user.role));
  const mobileItems = items.slice(0, 5);

  const renderItem = (item: (typeof items)[number], compact: boolean) => (
    <NavLink
      key={item.path}
      to={item.path}
      onClick={() => setDrawerOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-md font-medium ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'} ${
          isActive ? spec.itemActive : spec.itemBase
        }`
      }
    >
      <item.icon size={compact ? 14 : 16} />
      {item.label}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-surface text-primary-dark font-sans">
      {/* Mobile top bar */}
      <div className={`md:hidden flex items-center justify-between px-4 py-3 ${spec.mobileBarBg}`}>
        <BrandText spec={spec} />
        <button aria-label="Buka menu" onClick={() => setDrawerOpen(true)} className="p-2">
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button aria-label="Tutup menu" className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <nav className={`absolute left-0 top-0 h-full w-64 p-4 space-y-1 ${spec.sidebarBg}`}>
            <button aria-label="Tutup menu" onClick={() => setDrawerOpen(false)} className="mb-4 p-2 ml-auto flex">
              <X size={20} />
            </button>
            {items.map((item) => renderItem(item, false))}
          </nav>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className={`hidden md:flex flex-col w-60 min-h-screen sticky top-0 p-4 space-y-1 ${spec.sidebarBg}`}>
          <BrandText spec={spec} />
          <div className="border-t border-white/20 my-3" />
          {items.map((item) => renderItem(item, theme === 'auditor'))}
        </aside>

        <div className="flex-1 min-w-0">
          {/* Header: user identity + role badge + logout */}
          <header className="bg-white border-b border-primary-bg px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
            <span className="text-sm font-bold text-primary-dark">ZakatChain</span>
            <div className="flex items-center gap-3">
              <div className="text-right leading-tight">
                <p className="text-sm font-bold text-primary-dark">{user.username || 'Pengguna'}</p>
                <Badge tone={toRole(user.role) ? ROLE_BADGE_TONE[toRole(user.role) as Role] : 'neutral'}>
                  {user.role || 'PENGGUNA'}
                </Badge>
              </div>
              <button
                onClick={onLogout}
                aria-label="Keluar"
                className="inline-flex items-center min-h-[44px] gap-2 rounded-full px-3 text-sm font-medium text-primary-dark hover:bg-primary-bg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <LogOut size={16} /> <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </header>

          <main className="p-4 md:p-6 max-w-7xl mx-auto">{children}</main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className={`md:hidden fixed bottom-0 inset-x-0 z-40 flex justify-around py-2 ${spec.mobileBarBg}`}>
        {mobileItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${isActive ? 'opacity-100 font-bold' : 'opacity-70'}`
            }
          >
            <item.icon size={18} />
            {item.label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

const BrandText = ({ spec }: { spec: ThemeSpec }) => (
  <Link to="/" className="flex items-center gap-2 px-2">
    <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center text-primary-dark">
      <Zap size={18} />
    </div>
    <div className="flex flex-col leading-none">
      <span className={`font-extrabold tracking-tight ${spec.brandText}`}>
        Zakat<span className="text-gold">Chain</span>
      </span>
      <span className={`text-[9px] uppercase tracking-widest ${spec.brandSub}`}>Audit System</span>
    </div>
  </Link>
);

export default ShellFrame;
