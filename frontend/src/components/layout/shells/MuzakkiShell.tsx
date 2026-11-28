import { type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Calculator, Globe, Heart, LayoutDashboard, LogOut, Receipt, User } from 'lucide-react';
import zakatChainLogo from '../../../assets/zakatchain-logo.png';
import { Badge } from '../../ui';
import { ON_CHAIN_NOTE } from '../../ui/badgeStatus';
import type { SessionUser } from '../navConfig';

interface MuzakkiShellProps {
  user: SessionUser;
  onLogout: () => void;
  children: ReactNode;
}

const DESKTOP_NAV = [
  { label: 'Ringkasan', path: '/dashboard' },
  { label: 'Tunaikan Zakat', path: '/donate' },
  { label: 'Kalkulator', path: '/calculator' },
  { label: 'Program', path: '/campaigns' },
  { label: 'Riwayat & BSZ', path: '/my-donations' },
  { label: 'Transparansi', path: '/transparency' },
];

const MOBILE_BOTTOM_NAV = [
  { label: 'Ringkasan', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Zakat', path: '/donate', icon: Heart },
  { label: 'Kalkulator', path: '/calculator', icon: Calculator },
  { label: 'Riwayat', path: '/my-donations', icon: Receipt },
  { label: 'Profil', path: '/profile', icon: User },
];

/** Dedicated clean consumer fintech shell for Muzakki (USER role). */
const MuzakkiShell = ({ user, onLogout, children }: MuzakkiShellProps) => (
  <div className="min-h-screen flex flex-col bg-cream text-slateText font-sans">
    <header className="no-print sticky top-0 z-40 h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <img src={zakatChainLogo} alt="Logo ZakatChain" className="w-8 h-8 object-contain shrink-0" />
          <span className="font-display font-extrabold text-lg tracking-tight text-forest-dark whitespace-nowrap">
            Zakat<span className="text-primary">Chain</span>
          </span>
        </Link>

        <nav
          aria-label="Navigasi Muzakki"
          className="hidden lg:flex items-center gap-1 rounded-xl bg-slate-100/80 p-1 border border-slate-200/70"
        >
          {DESKTOP_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `shrink-0 whitespace-nowrap px-3 py-1.5 rounded-[9px] text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-white text-primary font-semibold shadow-xs'
                    : 'text-slateText hover:text-forest-dark hover:bg-white/60'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/verify"
            className="hidden md:inline-flex items-center gap-1.5 min-h-[36px] rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-semibold text-forest-dark hover:bg-mint transition-colors"
          >
            <Globe size={14} className="text-primary" /> Verifikasi
          </Link>
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 min-h-[36px] rounded-[10px] border border-slate-200 bg-cream px-2.5 sm:px-3 text-xs font-semibold text-forest-dark hover:bg-mint transition-colors"
          >
            <span className="max-w-[96px] truncate">{user.username}</span>
            <Badge tone="primary">Muzakki</Badge>
          </Link>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Keluar"
            title="Keluar"
            className="p-2 rounded-[10px] border border-slate-200 bg-white text-slate-600 hover:text-danger hover:bg-red-50 transition-colors shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>

    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 lg:pb-12">
      {children}
    </main>

    <footer className="no-print hidden lg:block border-t border-slate-200/80 bg-white/70 py-4 px-8">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 text-xs text-slate-500">
        <span>Pembayaran diproses resmi dalam Rupiah (IDR).</span>
        <span>{ON_CHAIN_NOTE}</span>
      </div>
    </footer>

    <nav
      aria-label="Menu bawah Muzakki"
      className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white/95 backdrop-blur border-t border-slate-200 grid grid-cols-5"
    >
      {MOBILE_BOTTOM_NAV.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/dashboard'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
              isActive ? 'text-primary' : 'text-slate-500 hover:text-forest-dark'
            }`
          }
        >
          <item.icon size={18} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  </div>
);

export default MuzakkiShell;
