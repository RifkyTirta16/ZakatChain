import type { LucideIcon } from 'lucide-react';
import {
  Boxes,
  Download,
  FilePlus,
  FileSearch,
  Heart,
  LayoutDashboard,
  LogIn,
  Map,
  Megaphone,
  RefreshCcw,
  ScrollText,
  Share2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export type Role = 'USER' | 'AMIL' | 'AUDITOR' | 'ADMIN';

export interface SessionUser {
  id?: number;
  username?: string;
  role?: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Empty array = visible to everyone, including anonymous visitors. */
  roles: Role[];
}

export const ALL_ROLES: Role[] = ['USER', 'AMIL', 'AUDITOR', 'ADMIN'];

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['AMIL', 'AUDITOR', 'ADMIN'] },
  { label: 'Kampanye', path: '/campaigns', icon: Megaphone, roles: [] },
  { label: 'Donasi Saya', path: '/donate', icon: Heart, roles: ['USER', 'ADMIN'] },
  { label: 'Verifikasi Publik', path: '/verify', icon: ShieldCheck, roles: [] },
  { label: 'Catatan Distribusi', path: '/new-record', icon: FilePlus, roles: ['AMIL', 'ADMIN'] },
  { label: 'Pemetaan Kemiskinan', path: '/mapping', icon: Map, roles: ['AMIL', 'ADMIN'] },
  { label: 'Anomali', path: '/anomalies', icon: AlertTriangle, roles: ['AUDITOR', 'ADMIN'] },
  { label: 'Verifikasi Bukti', path: '/proofs', icon: FileSearch, roles: ['AUDITOR', 'ADMIN'] },
  { label: 'Rekonsiliasi', path: '/reconciliation', icon: RefreshCcw, roles: ['AUDITOR', 'ADMIN'] },
  { label: 'Log Audit', path: '/audit', icon: ScrollText, roles: ['AUDITOR', 'ADMIN'] },
  { label: 'On-Chain Explorer', path: '/explorer', icon: Boxes, roles: ['AUDITOR', 'ADMIN'] },
  { label: 'Evidence Graph', path: '/graph', icon: Share2, roles: ['AUDITOR', 'ADMIN'] },
  { label: 'Ekspor', path: '/export', icon: Download, roles: ['AUDITOR', 'ADMIN'] },
];

/** Shown in the public top navbar only for anonymous visitors. */
export const ANON_ITEMS: NavItem[] = [
  { label: 'Masuk', path: '/login', icon: LogIn, roles: [] },
];

export const toRole = (role: string | undefined): Role | null =>
  role === 'USER' || role === 'AMIL' || role === 'AUDITOR' || role === 'ADMIN' ? role : null;

export const itemsForRole = (role: Role | null): NavItem[] => {
  if (role === null) {
    return [...NAV_ITEMS.filter((item) => item.roles.length === 0), ...ANON_ITEMS];
  }
  return NAV_ITEMS.filter((item) => item.roles.length === 0 || item.roles.includes(role));
};

export const rolesForPath = (path: string): Role[] =>
  NAV_ITEMS.find((item) => item.path === path)?.roles ?? [];
