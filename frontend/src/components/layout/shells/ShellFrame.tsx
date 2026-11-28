import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, Menu, Search, X } from 'lucide-react';
import zakatChainLogo from '../../../assets/zakatchain-logo.png';
import { Badge } from '../../ui';
import { NetworkBadge, PoweredByEthereum } from '../../ethereum';
import {
  PAGE_TITLES,
  ROLE_LABELS,
  itemsForRole,
  toRole,
  type NavItem,
  type Role,
  type SessionUser,
} from '../navConfig';

export type ShellTheme = 'public' | 'muzakki' | 'amil' | 'auditor' | 'admin';

interface ShellFrameProps {
  theme: Exclude<ShellTheme, 'public'>;
  user: SessionUser;
  onLogout: () => void;
  children: ReactNode;
}

const ROLE_SUBTITLE: Record<Exclude<ShellTheme, 'public'>, string> = {
  muzakki: 'Portal Muzakki',
  amil: 'Operasional Amil Zakat',
  auditor: 'Audit & Pengawasan Independen',
  admin: 'Konsol Administrator Sistem',
};

const ROLE_BADGE_TONE: Record<Role, 'primary' | 'gold' | 'sky' | 'neutral'> = {
  USER: 'primary',
  AMIL: 'gold',
  AUDITOR: 'sky',
  ADMIN: 'primary',
};

const groupItems = (items: NavItem[]): [string, NavItem[]][] => {
  const map = new Map<string, NavItem[]>();
  for (const item of items) {
    const key = item.group || 'Menu';
    const arr = map.get(key) ?? [];
    arr.push(item);
    map.set(key, arr);
  }
  return Array.from(map.entries());
};

const ROLE_ACCENT_DOT: Record<Exclude<ShellTheme, 'public'>, string> = {
  muzakki: 'bg-emerald-400',
  amil: 'bg-gold',
  auditor: 'bg-sky-400',
  admin: 'bg-gold-light',
};

/**
 * Unified commercial SaaS application shell for all signed-in roles.
 * Deep Forest sidebar + clean Soft Cream workspace + top breadcrumb/network bar.
 */
const ShellFrame = ({ theme, user, onLogout, children }: ShellFrameProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const handleQuickLookup = (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = quickQuery.trim();
    if (!cleaned) return;
    setQuickQuery('');
    if (/^(BSZ-|0x|#?\d+$)/i.test(cleaned)) {
      navigate(`/verify?query=${encodeURIComponent(cleaned)}`);
    } else {
      navigate(`/explorer?search=${encodeURIComponent(cleaned)}`);
    }
  };
  const role = toRole(user.role);
  const items = itemsForRole(role);
  const grouped = groupItems(items);

  const pageTitle =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith('/campaigns/') ? 'Rincian Program Zakat' : 'ZakatChain');

  const renderNavContent = (closeOnClick: boolean) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10 bg-crypto-grid">
        <Link
          to="/dashboard"
          onClick={() => closeOnClick && setDrawerOpen(false)}
          className="flex items-center gap-2.5"
        >
          <div className="w-9 h-9 rounded-[10px] bg-white/95 p-1 flex items-center justify-center shrink-0 shadow-xs">
            <img
              src={zakatChainLogo}
              alt="Logo ZakatChain"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="font-display font-extrabold text-lg text-white tracking-tight block leading-none">
              Zakat<span className="text-gold-light">Chain</span>
            </span>
            <span className="text-[11px] text-white/70 inline-flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${ROLE_ACCENT_DOT[theme]}`} />
              {ROLE_SUBTITLE[theme]}
            </span>
          </div>
        </Link>
      </div>

      {/* Grouped Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {grouped.map(([groupName, groupList]) => (
          <div key={groupName} className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
              {groupName}
            </p>
            {groupList.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/' || item.path === '/dashboard'}
                onClick={() => closeOnClick && setDrawerOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/12 text-white font-semibold border-l-2 border-gold shadow-xs'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <item.icon size={16} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-white/10 space-y-3 bg-black/15">
        {theme !== 'muzakki' && (
          <PoweredByEthereum variant="dark" className="w-full justify-center" />
        )}
        <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{user.username}</p>
            <p className="text-[11px] text-white/60 truncate">
              {role ? ROLE_LABELS[role] : user.role}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Keluar dari akun"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Keluar"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream text-slateText flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-forest-dark text-white sticky top-0 h-screen">
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-forest-dark text-white shadow-2xl">
            <button
              type="button"
              aria-label="Tutup navigasi"
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-3 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 z-10"
            >
              <X size={18} />
            </button>
            {renderNavContent(true)}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Utility Header */}
        <header className="sticky top-0 z-30 h-16 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Buka menu navigasi"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-[10px] border border-slate-200 text-forest-dark hover:bg-slate-50 shrink-0"
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
                <span>ZakatChain</span>
                <ChevronRight size={12} />
                <span className="text-slate-600 font-medium">{ROLE_SUBTITLE[theme]}</span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-forest-dark truncate">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <form onSubmit={handleQuickLookup} className="hidden md:flex items-center relative">
              <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                type="search"
                aria-label="Cari ID laporan, BSZ, atau hash"
                placeholder="Cari #ID, BSZ, atau hash…"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                className="w-48 lg:w-56 h-9 rounded-[10px] border border-slate-200 bg-cream/70 pl-8 pr-3 text-xs text-forest-dark placeholder:text-slate-400 outline-none focus:bg-white focus:border-primary"
              />
            </form>
            {theme !== 'muzakki' && <NetworkBadge compact />}
            <Link
              to="/profile"
              className="hidden sm:inline-flex items-center gap-2 rounded-[10px] border border-slate-200 bg-cream px-3 py-1.5 text-xs font-semibold text-forest-dark hover:bg-mint transition-colors"
            >
              <span>{user.username}</span>
              <Badge tone={role ? ROLE_BADGE_TONE[role] : 'neutral'}>
                {role ? ROLE_LABELS[role] : user.role}
              </Badge>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ShellFrame;
