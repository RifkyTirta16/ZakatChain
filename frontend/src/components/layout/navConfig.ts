import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Calculator,
  ClipboardList,
  Cpu,
  Download,
  FilePlus,
  FileSearch,
  Globe,
  Heart,
  LayoutDashboard,
  Map,
  Megaphone,
  Receipt,
  RefreshCcw,
  ScrollText,
  Share2,
  ShieldCheck,
  UserCheck,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

export type Role = 'USER' | 'AMIL' | 'AUDITOR' | 'ADMIN';

export interface SessionUser {
  id: number;
  username: string;
  role: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  group?: string;
  /** Empty array = accessible to every signed-in role (and public pages when marked public). */
  roles: Role[];
}

export const ALL_ROLES: Role[] = ['USER', 'AMIL', 'AUDITOR', 'ADMIN'];

export const ROLE_LABELS: Record<Role, string> = {
  USER: 'Muzakki',
  AMIL: 'Amil Zakat',
  AUDITOR: 'Auditor Independen',
  ADMIN: 'Administrator',
};

export const NAV_ITEMS: NavItem[] = [
  // Shared Dashboard Entry
  { label: 'Ringkasan', path: '/dashboard', icon: LayoutDashboard, group: 'Utama', roles: ['USER', 'AMIL', 'AUDITOR', 'ADMIN'] },

  // Muzakki (USER only — keeps roles distinctly separated and low-clutter)
  { label: 'Kalkulator Zakat', path: '/calculator', icon: Calculator, group: 'Layanan Zakat', roles: ['USER'] },
  { label: 'Tunaikan Zakat', path: '/donate', icon: Heart, group: 'Layanan Zakat', roles: ['USER'] },
  { label: 'Riwayat & Bukti BSZ', path: '/my-donations', icon: Receipt, group: 'Layanan Zakat', roles: ['USER'] },
  { label: 'Portal Transparansi', path: '/transparency', icon: Globe, group: 'Transparansi', roles: ['USER'] },

  // Shared Operational / Public-Aligned
  { label: 'Program Zakat', path: '/campaigns', icon: Megaphone, group: 'Program & Penyaluran', roles: [] },
  { label: 'Verifikasi Laporan', path: '/verify', icon: ShieldCheck, group: 'Program & Penyaluran', roles: [] },

  // Amil (AMIL + ADMIN)
  { label: 'Catat Distribusi', path: '/new-record', icon: FilePlus, group: 'Operasional Amil', roles: ['AMIL', 'ADMIN'] },
  { label: 'Data Mustahik', path: '/mustahik', icon: ClipboardList, group: 'Operasional Amil', roles: ['AMIL', 'AUDITOR', 'ADMIN'] },
  { label: 'Pemetaan Kemiskinan', path: '/mapping', icon: Map, group: 'Operasional Amil', roles: ['AMIL', 'AUDITOR', 'ADMIN'] },

  // Explorer & Graph (AMIL, AUDITOR, ADMIN - matches backend GET /transactions & /donations)
  { label: 'Analitik Penyaluran', path: '/analytics', icon: BarChart3, group: 'Transparansi & Audit', roles: ['AMIL', 'AUDITOR', 'ADMIN'] },
  { label: 'Blockchain Explorer', path: '/explorer', icon: Boxes, group: 'Transparansi & Audit', roles: ['AMIL', 'AUDITOR', 'ADMIN'] },
  { label: 'Evidence Graph', path: '/graph', icon: Share2, group: 'Transparansi & Audit', roles: ['AMIL', 'AUDITOR', 'ADMIN'] },

  // Auditor + Admin (matches backend routes exactly)
  { label: 'Anomali Distribusi', path: '/anomalies', icon: AlertTriangle, group: 'Transparansi & Audit', roles: ['AUDITOR', 'ADMIN'] },
  { label: 'Verifikasi Bukti', path: '/proofs', icon: FileSearch, group: 'Transparansi & Audit', roles: ['AUDITOR', 'ADMIN'] },
  { label: 'Rekonsiliasi Dana', path: '/reconciliation', icon: RefreshCcw, group: 'Transparansi & Audit', roles: ['AUDITOR', 'ADMIN'] },
  { label: 'Log Audit', path: '/audit', icon: ScrollText, group: 'Transparansi & Audit', roles: ['AUDITOR', 'ADMIN'] },
  { label: 'Ekspor CSV', path: '/export', icon: Download, group: 'Transparansi & Audit', roles: ['AUDITOR', 'ADMIN'] },

  // Administrator Monitoring & System
  { label: 'Jaringan & Kontrak', path: '/network', icon: Cpu, group: 'Sistem & Tata Kelola', roles: ['ADMIN'] },
  { label: 'Peran & Hak Akses', path: '/roles', icon: UserCheck, group: 'Sistem & Tata Kelola', roles: ['ADMIN'] },

  // Shared Account
  { label: 'Profil & Akun', path: '/profile', icon: UserCog, group: 'Akun', roles: ['USER', 'AMIL', 'AUDITOR', 'ADMIN'] },
  { label: 'Portal Publik', path: '/', icon: Globe, group: 'Akun', roles: ['AMIL', 'AUDITOR', 'ADMIN'] },
];

export const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard Utama',
  '/calculator': 'Kalkulator Zakat',
  '/donate': 'Tunaikan Zakat',
  '/my-donations': 'Riwayat, Jejak Wilayah & BSZ',
  '/transparency': 'Portal Transparansi Publik',
  '/campaigns': 'Program Zakat',
  '/verify': 'Verifikasi On-Chain',
  '/new-record': 'Catatan Distribusi Baru',
  '/mustahik': 'Master Data Mustahik (Privat)',
  '/mapping': 'Pemetaan Kemiskinan & Wilayah',
  '/explorer': 'Ethereum Blockchain Explorer',
  '/graph': 'Evidence Graph',
  '/anomalies': 'Deteksi & Resolusi Anomali',
  '/proofs': 'Antrean Verifikasi Bukti',
  '/reconciliation': 'Rekonsiliasi Keuangan',
  '/audit': 'Log Audit Aktivitas',
  '/export': 'Ekspor Laporan CSV',
  '/network': 'Monitoring Jaringan & Smart Contract',
  '/roles': 'Manajemen Peran & Kebijakan Akses',
  '/analytics': 'Analitik Penyaluran Zakat',
  '/profile': 'Profil & Informasi Sesi',
};

export const toRole = (role: string | undefined): Role | null =>
  role === 'USER' || role === 'AMIL' || role === 'AUDITOR' || role === 'ADMIN' ? role : null;

export const itemsForRole = (role: Role | null): NavItem[] => {
  if (role === null) return [];
  return NAV_ITEMS.filter((item) => item.roles.length === 0 || item.roles.includes(role));
};

export const rolesForPath = (path: string): Role[] =>
  NAV_ITEMS.find((item) => item.path === path)?.roles ?? [];

export const canAccessPath = (role: Role | null, rawTarget: string | null | undefined): boolean => {
  if (!rawTarget || !rawTarget.startsWith('/') || rawTarget.startsWith('//')) return false;
  const pathname = (rawTarget.split(/[?#]/)[0] || '/').trim();
  if (pathname === '/login' || pathname === '/register') return false;
  const matched = NAV_ITEMS.find((item) => item.path === pathname);
  if (matched) {
    return matched.roles.length === 0 || (role !== null && matched.roles.includes(role));
  }
  return (
    pathname === '/' ||
    pathname === '/transparency' ||
    pathname === '/programs' ||
    pathname === '/campaigns' ||
    pathname.startsWith('/campaigns/') ||
    pathname === '/calculator' ||
    pathname === '/verify'
  );
};

export const UNUSED_ICON_REF = ClipboardList;
