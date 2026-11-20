import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Badge } from '../../ui';
import { NetworkBadge, PoweredByEthereum } from '../../ethereum';
import { toRole, type SessionUser } from '../navConfig';

interface PublicShellProps {
  user: SessionUser | null;
  onLogout: () => void;
  children: ReactNode;
}

const CURRENT_YEAR = new Date().getFullYear();

const PUBLIC_NAV = [
  { label: 'Beranda', path: '/' },
  { label: 'Program Zakat', path: '/campaigns' },
  { label: 'Kalkulator', path: '/calculator' },
  { label: 'Transparansi', path: '/transparency' },
  { label: 'Verifikasi', path: '/verify' },
];

/**
 * Public website shell used for /, /campaigns, /calculator, /transparency, /verify,
 * and for logged-in Muzakki browsing public pages.
 */
const PublicShell = ({ user, onLogout, children }: PublicShellProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = toRole(user?.role);

  return (
    <div className="min-h-screen flex flex-col bg-cream text-slateText font-sans">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-9 h-9 rounded-[10px] bg-gradient-to-b from-primary-light to-primary flex items-center justify-center text-white shadow-teal-glow border border-primary/80 transition-transform group-hover:scale-[1.03]">
                <ShieldCheck size={19} />
              </div>
              <div className="leading-tight">
                <span className="font-display font-extrabold text-lg tracking-tight text-forest-dark">
                  Zakat<span className="text-primary">Chain</span>
                </span>
              </div>
            </Link>
            <div className="hidden xl:block shrink-0">
              <PoweredByEthereum />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav aria-label="Navigasi publik" className="hidden lg:flex items-center gap-0.5 rounded-xl bg-slate-100/70 p-1 border border-slate-200/60">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `px-2.5 xl:px-3 py-1.5 rounded-[9px] text-xs xl:text-sm font-medium transition-all whitespace-nowrap ${
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

          {/* Right Actions */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <NetworkBadge compact className="hidden 2xl:inline-flex" />
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 min-h-[38px] rounded-[10px] bg-gradient-to-b from-primary-light to-primary px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white hover:to-forest shadow-teal-glow transition-all"
                >
                  <LayoutDashboard size={15} />
                  <span>Dashboard</span>
                </Link>
                <Badge tone={role ? 'primary' : 'neutral'}>{user.role}</Badge>
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="Keluar"
                  className="inline-flex items-center gap-1.5 min-h-[38px] rounded-[10px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slateText hover:bg-slate-50 transition-colors"
                >
                  <LogOut size={14} />
                  <span>Keluar</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 min-h-[38px] rounded-[10px] border border-slate-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-forest-dark hover:bg-slate-50 transition-colors"
                >
                  <LogIn size={15} />
                  <span>Masuk</span>
                </Link>
                <Link
                  to="/donate"
                  className="inline-flex items-center min-h-[38px] rounded-[10px] bg-gradient-to-b from-primary-light to-primary px-4 py-1.5 text-xs sm:text-sm font-semibold text-white hover:to-forest shadow-teal-glow transition-all"
                >
                  Tunaikan Zakat
                </Link>
              </>
            )}
          </div>

          {/* Mobile / Tablet Hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-[10px] border border-slate-200 text-forest-dark hover:bg-slate-100"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile / Tablet Drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <PoweredByEthereum />
              <NetworkBadge compact />
            </div>
            <nav className="grid gap-1">
              {PUBLIC_NAV.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-3.5 py-2.5 rounded-[10px] text-sm font-medium ${
                      isActive ? 'bg-mint text-primary font-semibold' : 'text-slateText hover:bg-slate-50'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-[10px] bg-primary text-white text-sm font-semibold"
                  >
                    <LayoutDashboard size={16} /> Buka Dashboard ({user.username})
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      onLogout();
                    }}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-[10px] border border-slate-300 text-sm font-semibold text-slateText"
                  >
                    <LogOut size={16} /> Keluar
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/donate"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center min-h-[44px] rounded-[10px] bg-primary text-white text-sm font-semibold"
                  >
                    Tunaikan Zakat
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-[10px] border border-slate-300 text-sm font-semibold text-forest-dark"
                  >
                    <LogIn size={16} /> Masuk / Daftar
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer with Ethereum Ecosystem Attribution */}
      <footer className="relative bg-forest-dark bg-crypto-grid text-white/85 border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[10px] bg-primary flex items-center justify-center text-white">
                  <ShieldCheck size={20} />
                </div>
                <span className="font-display font-extrabold text-xl text-white">
                  Zakat<span className="text-gold">Chain</span>
                </span>
              </div>
              <p className="font-arabic text-lg text-gold-light" dir="rtl" lang="ar">
                خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِم بِهَا
              </p>
              <p className="text-sm text-white/75 leading-relaxed max-w-md">
                Trust in Giving. Transparency in Every Transaction. Platform pengelolaan zakat
                berbasis Rupiah (IDR) dengan lapisan audit kriptografi pada ekosistem Ethereum.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <PoweredByEthereum variant="dark" />
                <NetworkBadge variant="dark" />
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gold">Layanan</h3>
              <ul className="space-y-2 text-sm text-white/75">
                <li><Link to="/campaigns" className="hover:text-white">Program Zakat</Link></li>
                <li><Link to="/calculator" className="hover:text-white">Kalkulator Zakat</Link></li>
                <li><Link to="/donate" className="hover:text-white">Tunaikan Zakat</Link></li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gold">Transparansi Web3</h3>
              <ul className="space-y-2 text-sm text-white/75">
                <li><Link to="/transparency" className="hover:text-white">Dasbor Transparansi Publik</Link></li>
                <li><Link to="/verify" className="hover:text-white">Verifikasi Hash Laporan</Link></li>
              </ul>
            </div>

            <div className="md:col-span-2 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gold">Akun</h3>
              <ul className="space-y-2 text-sm text-white/75">
                <li><Link to="/login" className="hover:text-white">Masuk</Link></li>
                <li><Link to="/register" className="hover:text-white">Daftar Muzakki</Link></li>
                {user && <li><Link to="/dashboard" className="hover:text-white">Dashboard Saya</Link></li>}
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/60">
            <p>© {CURRENT_YEAR} ZakatChain. Pembayaran zakat diproses dalam Rupiah (IDR), bukan ETH.</p>
            <p>
              Catatan Integritas: Pencatatan on-chain membuktikan keberadaan hash audit, bukan kebenaran penerimaan di lapangan.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicShell;
