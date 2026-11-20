import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Cpu,
  FileSearch,
  HeartHandshake,
  RefreshCcw,
  ShieldCheck,
  UserCheck,
  Wallet,
} from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime, formatIDR, shortHash } from '../../utils/format';
import {
  ActionPanel,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ON_CHAIN_NOTE,
  SectionHeader,
  Skeleton,
  StatCard,
} from '../../components/ui';
import { NetworkBadge } from '../../components/ethereum';
import { Analytics } from '../../components/Analytics';
import type { Transaction } from '../Dashboard';

interface DashboardStats {
  kpis: {
    totalDonations: number;
    totalDistributed: number;
    totalReports: number;
    verifiedReports: number;
    pendingReports: number;
    openAnomalies: number;
    balance: number;
  };
  networkStatus: {
    rpc: string;
    contract: string;
    status: string;
    chainId?: number | null;
    networkName?: string;
    contractAddress?: string;
    blockNumber?: number | null;
  };
}

interface ReconciliationLog {
  id: number;
  reconciliation_date: string;
  total_donations: number | null;
  total_distributions: number | null;
  balance: number | null;
  status: string | null;
}

interface AdminUserRow {
  id: number;
  username: string;
  role: string;
}

const NETWORK_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  Healthy: 'success',
  Degraded: 'warning',
  Unknown: 'danger',
};

const AdminHome = () => {
  const statsQuery = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardStats>('/dashboard/stats');
      return data;
    },
    refetchInterval: 30_000,
  });

  const reconQuery = useQuery<ReconciliationLog[]>({
    queryKey: ['reconciliation-history'],
    queryFn: async () => {
      const { data } = await apiClient.get<ReconciliationLog[]>('/reconciliation/history');
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 60_000,
  });

  const txQuery = useQuery<Transaction[]>({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const { data } = await apiClient.get<Transaction[]>('/transactions');
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30_000,
  });

  const usersQuery = useQuery<AdminUserRow[]>({
    queryKey: ['admin-users-summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<AdminUserRow[]>('/users');
      return Array.isArray(data) ? data : [];
    },
  });

  const stats = statsQuery.data;
  const reconLogs = reconQuery.data ?? [];
  const lastRecon = reconLogs[0];
  const transactions = txQuery.data ?? [];
  const usersList = usersQuery.data ?? [];
  const pendingProofs = transactions.filter(
    (t) =>
      t.proof_status === null ||
      ['DRAFT', 'PENDING', 'PENDING_BLOCKCHAIN'].includes(t.proof_status ?? ''),
  ).length;

  const loading = statsQuery.isPending || reconQuery.isPending;
  const error = statsQuery.isError || reconQuery.isError;

  if (error) {
    return (
      <ErrorState
        message="Gagal memuat ringkasan sistem Administrator. Periksa koneksi ke server."
        retry={() => {
          void statsQuery.refetch();
          void reconQuery.refetch();
        }}
      />
    );
  }

  const tasks = stats
    ? [
        { label: 'Bukti Menunggu Review', jumlah: pendingProofs, href: '/proofs', tone: 'sky' as const },
        { label: 'Anomali Terbuka', jumlah: stats.kpis.openAnomalies, href: '/anomalies', tone: 'coral' as const },
        { label: 'Laporan Tertunda On-Chain', jumlah: stats.kpis.pendingReports, href: '/explorer', tone: 'gold' as const },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Konsol Administrator ZakatChain"
          subtitle="Pemantauan kesehatan platform, status jaringan Ethereum, rekonsiliasi dana, dan tata kelola sistem."
        />
        <NetworkBadge />
      </div>

      {loading ? (
        <Skeleton lines={8} />
      ) : !stats ? (
        <EmptyState
          icon={<Activity size={24} />}
          title="Ringkasan sistem belum tersedia"
          description="Data akan muncul setelah backend merespons."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Donasi Terkonfirmasi"
              value={formatIDR(stats.kpis.totalDonations)}
              icon={<HeartHandshake size={18} />}
              tone="emerald"
            />
            <StatCard
              label="Dana Tersalurkan"
              value={formatIDR(stats.kpis.totalDistributed)}
              icon={<Wallet size={18} />}
              tone="forest"
            />
            <StatCard
              label="Anomali Terbuka"
              value={`${stats.kpis.openAnomalies} temuan`}
              icon={<AlertTriangle size={18} />}
              tone={stats.kpis.openAnomalies > 0 ? 'danger' : 'neutral'}
            />
            <StatCard
              label="Jaringan Ethereum"
              value={stats.networkStatus.networkName || stats.networkStatus.status}
              sublabel={`RPC: ${stats.networkStatus.rpc} · Kontrak: ${stats.networkStatus.contract}`}
              icon={<Cpu size={18} />}
              tone={stats.networkStatus.status === 'Healthy' ? 'emerald' : 'gold'}
            />
          </div>

          <ActionPanel tasks={tasks} />

          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-forest-dark flex items-center gap-2">
                  <ShieldCheck size={17} className="text-primary" /> Status Smart Contract & RPC
                </h2>
                <Badge tone={NETWORK_TONE[stats.networkStatus.status] ?? 'warning'}>
                  {stats.networkStatus.status}
                </Badge>
              </div>
              <div className="space-y-2 text-xs font-mono bg-cream rounded-xl p-4 border border-slate-200">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Jaringan</span>
                  <span className="font-bold text-forest-dark">
                    {stats.networkStatus.networkName || 'Jaringan Tidak Tersedia'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Chain ID</span>
                  <span className="font-bold text-forest-dark">{stats.networkStatus.chainId ?? '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Kontrak Target</span>
                  <span className="font-bold text-forest-dark">
                    {shortHash(stats.networkStatus.contractAddress, 10, 8)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Nomor Blok</span>
                  <span className="font-bold text-forest-dark">{stats.networkStatus.blockNumber ?? '-'}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/network"
                  className="inline-flex items-center gap-1.5 min-h-[38px] rounded-[10px] border border-slate-300 px-3 text-xs font-semibold text-forest-dark hover:bg-mint"
                >
                  <Cpu size={14} /> Detail Jaringan & Kontrak
                </Link>
                <Link
                  to="/explorer"
                  className="inline-flex items-center gap-1.5 min-h-[38px] rounded-[10px] border border-slate-300 px-3 text-xs font-semibold text-forest-dark hover:bg-mint"
                >
                  <ShieldCheck size={14} /> Catat / Revoke On-Chain
                </Link>
                <Link
                  to="/roles"
                  className="inline-flex items-center gap-1.5 min-h-[38px] rounded-[10px] border border-slate-300 px-3 text-xs font-semibold text-forest-dark hover:bg-mint"
                >
                  <UserCheck size={14} /> Manajemen Akun ({usersList.length})
                </Link>
              </div>
              {usersList.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                  {(['USER', 'AMIL', 'AUDITOR', 'ADMIN'] as const).map((r) => (
                    <div key={r} className="rounded-lg bg-slate-50 border border-slate-200/80 py-2">
                      <span className="text-[10px] font-bold text-slate-500 block">{r}</span>
                      <span className="font-display text-sm font-extrabold text-forest-dark tabular-nums">
                        {usersList.filter((u) => u.role === r).length}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-forest-dark flex items-center gap-2">
                  <RefreshCcw size={17} className="text-primary" /> Rekonsiliasi Terakhir
                </h2>
                <Link to="/reconciliation" className="text-xs font-semibold text-primary hover:underline">
                  Kelola →
                </Link>
              </div>

              {!lastRecon ? (
                <EmptyState
                  icon={<FileSearch size={22} />}
                  title="Belum ada riwayat rekonsiliasi"
                  description="Jalankan rekonsiliasi saldo dari halaman Rekonsiliasi Dana."
                />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-mint border border-primary/20">
                      <span className="text-slate-500 block">Donasi</span>
                      <span className="font-bold text-forest-dark tabular-nums">
                        {formatIDR(lastRecon.total_donations ?? 0)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-cream border border-slate-200">
                      <span className="text-slate-500 block">Distribusi</span>
                      <span className="font-bold text-forest-dark tabular-nums">
                        {formatIDR(lastRecon.total_distributions ?? 0)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-cream border border-slate-200">
                      <span className="text-slate-500 block">Saldo Net</span>
                      <span className="font-bold text-forest-dark tabular-nums">
                        {formatIDR(lastRecon.balance ?? 0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{formatDateTime(lastRecon.reconciliation_date)}</span>
                    <Badge tone={lastRecon.status === 'BALANCED' ? 'success' : 'gold'}>
                      {lastRecon.status || 'Tidak diketahui'}
                    </Badge>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">{ON_CHAIN_NOTE}</p>
            </Card>
          </div>

          <Analytics transactions={transactions} />
        </>
      )}
    </div>
  );
};

export default AdminHome;
