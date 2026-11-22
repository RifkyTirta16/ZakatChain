import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import zakatChainLogo from '../../../assets/zakatchain-logo.png';
import { Badge } from '../../ui';
import { PoweredByEthereum } from '../../ethereum';
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
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-6">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <img
              src={zakatChainLogo}
              alt="Logo ZakatChain"
              className="w-9 h-9 object-contain shrink-0 transition-transform group-hover:scale-[1.04]"
            />
            <span className="font-display font-extrabold text-lg tracking-tight text-forest-dark whitespace-nowrap">
              Zakat<span className="text-primary">Chain</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            aria-label="Navigasi publik"
            className="hidden lg:flex items-center gap-1 rounded-xl bg-slate-100/80 p-1 border border-slate-200/70 shrink-0"
          >
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `shrink-0 whitespace-nowrap px-3 py-1.5 rounded-[9px] text-[13px] xl:text-sm font-medium transition-all ${
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
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            {user ? (
              <>
                <span className="hidden xl:inline-flex shrink-0">
                  <Badge tone={role ? 'primary' : 'neutral'}>{user.role}</Badge>
                </span>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 min-h-[38px] rounded-[10px] bg-gradient-to-b from-primary-light to-primary px-3.5 py-1.5 text-xs xl:text-sm font-semibold text-white hover:to-forest shadow-teal-glow transition-all whitespace-nowrap shrink-0"
                >
                  <LayoutDashboard size={15} />
                  <span>Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="Keluar"
                  className="inline-flex items-center gap-1.5 min-h-[38px] rounded-[10px] border border-slate-200 bg-white px-3 py-1.5 text-xs xl:text-sm font-semibold text-slateText hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut size={14} />
                  <span>Keluar</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 min-h-[38px] rounded-[10px] border border-slate-200 bg-white px-3.5 py-1.5 text-xs xl:text-sm font-semibold text-forest-dark hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <LogIn size={15} />
                  <span>Masuk</span>
                </Link>
                <Link
                  to="/donate"
                  className="inline-flex items-center min-h-[38px] rounded-[10px] bg-gradient-to-b from-primary-light to-primary px-4 py-1.5 text-xs xl:text-sm font-semibold text-white hover:to-forest shadow-teal-glow transition-all whitespace-nowrap shrink-0"
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
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-[10px] border border-slate-200 text-forest-dark hover:bg-slate-100 shrink-0"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile / Tablet Drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
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
                <div className="w-9 h-9 rounded-[10px] bg-white/95 p-1 flex items-center justify-center shrink-0 shadow-xs">
                  <img
                    src={zakatChainLogo}
                    alt="Logo ZakatChain"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-display font-extrabold text-xl text-white">
                  Zakat<span className="text-gold">Chain</span>
                </span>
              </div>
              <p className="font-arabic text-lg text-gold-light" dir="rtl" lang="ar">
                خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِم بِهَا
              </p>
              <p className="text-sm text-white/75 leading-relaxed max-w-md">
                Amanah dalam penghimpunan, transparan dalam setiap penyaluran. Platform zakat berbasis
                Rupiah (IDR) dengan pencatatan audit terbuka.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <PoweredByEthereum variant="dark" />
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-gold">Transparansi</h3>
              <ul className="space-y-2 text-sm text-white/75">
                <li><Link to="/transparency" className="hover:text-white">Portal Transparansi Publik</Link></li>
                <li><Link to="/verify" className="hover:text-white">Verifikasi Laporan</Link></li>
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
