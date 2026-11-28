import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Eye,
  FilePlus,
  HeartHandshake,
  Link2,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import apiClient from '../utils/api';
import { getStoredSessionUser } from '../components/layout/navConfig';
import { formatDateKey, formatDateTime, formatIDR, formatNumber, shortHash } from '../utils/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ON_CHAIN_NOTE,
  PaginationBar,
  SectionHeader,
  Select,
  Skeleton,
  StatCard,
  statusBadge,
} from '../components/ui';
import { TransactionDetailDrawer } from '../components/admin/TransactionDetailDrawer';

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
  categoryDistribution: { category: string; total: number }[];
}

export interface Transaction {
  id: number;
  amount: number;
  donor_name: string | null;
  recipient_name: string | null;
  category: string | null;
  region: string | null;
  timestamp: string;
  proof_url: string | null;
  audit_hash: string | null;
  anomaly_flag: number;
  anomaly_reason: string | null;
  tx_hash: string | null;
  blockchain_status: string | null;
  block_number: number | null;
  proof_status: string | null;
  proof_rejection_reason?: string | null;
}

interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

const CHART = {
  primary: '#047857',
  forest: '#064E3B',
  gold: '#C9A45C',
  danger: '#DC2626',
  sky: '#0284C7',
  grid: '#E2E8F0',
};

const PIE_COLORS = [CHART.primary, CHART.gold, CHART.danger, CHART.sky, CHART.forest];
const DEFAULT_CATEGORIES = ['Konsumsi', 'Kesehatan', 'Pendidikan', 'Modal Usaha'];

const Dashboard = () => {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [drawerTxId, setDrawerTxId] = useState<number | null>(null);

  const role = getStoredSessionUser()?.role ?? '';

  const statsQuery = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardStats>('/dashboard/stats');
      return data;
    },
    refetchInterval: 30_000,
  });

  const txQuery = useQuery<PaginatedTransactions>({
    queryKey: ['dashboard-transactions', search, filterCategory, filterStatus, limit, offset],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedTransactions>('/transactions', {
        params: {
          meta: '1',
          limit,
          offset,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(filterCategory ? { category: filterCategory } : {}),
          ...(filterStatus ? { status: filterStatus } : {}),
        },
      });
      return data;
    },
    refetchInterval: 30_000,
  });

  const transactions = useMemo(() => txQuery.data?.items ?? [], [txQuery.data?.items]);
  const totalTx = txQuery.data?.total ?? 0;

  const dailyFlow = useMemo(() => {
    const byDay = new Map<string, { date: string; total: number; count: number }>();
    for (const t of transactions) {
      const key = formatDateKey(t.timestamp);
      const entry = byDay.get(key) || { date: key, total: 0, count: 0 };
      entry.total += Number(t.amount) || 0;
      entry.count += 1;
      byDay.set(key, entry);
    }
    return Array.from(byDay.values()).reverse();
  }, [transactions]);

  const pendingBlockchain = useMemo(
    () => transactions.filter((t) => t.blockchain_status === 'PENDING_BLOCKCHAIN').length,
    [transactions]
  );

  const anomaliesOnPage = useMemo(
    () => transactions.filter((t) => Number(t.anomaly_flag) === 1).length,
    [transactions]
  );

  const retry = () => {
    void statsQuery.refetch();
    void txQuery.refetch();
  };

  if (statsQuery.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton lines={4} />
        <Skeleton lines={10} />
      </div>
    );
  }

  if (statsQuery.isError) {
    return (
      <ErrorState
        message="Gagal memuat data analitik penyaluran. Pastikan server backend berjalan."
        retry={retry}
      />
    );
  }

  const stats = statsQuery.data;
  if (!stats) {
    return (
      <Card>
        <EmptyState
          title="Data analitik belum tersedia"
          description="Server merespons tetapi tidak mengirim ringkasan statistik."
          action={<Button onClick={retry}>Muat Ulang</Button>}
        />
      </Card>
    );
  }

  const { kpis } = stats;
  const categoryData = (stats.categoryDistribution || []).map((c) => ({
    name: c.category || 'Tanpa Kategori',
    value: Number(c.total) || 0,
  }));

  const primaryAction =
    role === 'AMIL'
      ? { to: '/new-record', label: 'Catat Distribusi', icon: FilePlus }
      : { to: '/anomalies', label: 'Tinjau Anomali', icon: AlertTriangle };
  const PrimaryIcon = primaryAction.icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <SectionHeader
          title="Analitik & Buku Besar Penyaluran"
          subtitle="Visualisasi distribusi kategori, arus nilai penyaluran, serta daftar transaksi terpaginasi penuh."
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={statsQuery.isFetching || txQuery.isFetching}
            onClick={retry}
          >
            <RefreshCw size={14} /> Segarkan
          </Button>
          <Link
            to={primaryAction.to}
            className="inline-flex items-center gap-2 min-h-[38px] rounded-[10px] bg-gradient-to-b from-gold-light to-gold px-4 text-xs sm:text-sm font-semibold text-forest-dark shadow-gold-glow border border-gold-dark/25"
          >
            <PrimaryIcon size={15} /> {primaryAction.label}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Donasi Masuk"
          value={formatIDR(kpis.totalDonations)}
          sublabel="Donasi berstatus Terkonfirmasi"
          icon={<HeartHandshake size={18} />}
          tone="emerald"
        />
        <StatCard
          label="Total Terdistribusi"
          value={formatIDR(kpis.totalDistributed)}
          sublabel="Bukti disetujui & tercatat on-chain"
          icon={<Wallet size={18} />}
          tone="forest"
        />
        <StatCard
          label="Saldo Amanah"
          value={formatIDR(kpis.balance)}
          sublabel="Donasi terkonfirmasi minus distribusi valid"
          icon={<TrendingUp size={18} />}
          tone={kpis.balance >= 0 ? 'gold' : 'danger'}
        />
        <StatCard
          label="Anomali Terbuka"
          value={`${formatNumber(kpis.openAnomalies)} temuan`}
          sublabel={`${formatNumber(kpis.verifiedReports)} / ${formatNumber(kpis.totalReports)} laporan valid`}
          icon={<AlertTriangle size={18} />}
          tone={kpis.openAnomalies > 0 ? 'danger' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h2 className="text-base font-bold text-forest-dark flex items-center gap-2">
                <TrendingUp className="text-primary" size={18} /> Tren Nilai Penyaluran (Halaman Aktif)
              </h2>
              <span className="text-xs text-slate-500">
                {transactions.length} baris dari total {totalTx} laporan
              </span>
            </div>
            {dailyFlow.length === 0 ? (
              <EmptyState
                title="Belum ada transaksi"
                description="Grafik akan tampil setelah ada catatan distribusi."
              />
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyFlow}>
                    <defs>
                      <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART.primary} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={CHART.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="date" stroke={CHART.forest} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke={CHART.forest}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={72}
                      tickFormatter={(v: number) => formatNumber(v)}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12 }}
                      formatter={(value) => [formatIDR(Number(value)), 'Nilai laporan']}
                    />
                    <Area type="monotone" dataKey="total" stroke={CHART.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorVol)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-0 sm:p-0 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h2 className="text-base font-bold text-forest-dark">Buku Besar Transaksi Penyaluran</h2>
                <span className="text-xs text-slate-500 tabular-nums">Total {totalTx} catatan</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Cari nama atau hash audit…"
                    className="w-full min-h-[44px] bg-white border border-slate-300 pl-9 pr-3 rounded-[10px] text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setOffset(0);
                    }}
                  />
                </div>
                <Select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setOffset(0);
                  }}
                  options={[
                    { value: '', label: 'Semua Kategori' },
                    ...DEFAULT_CATEGORIES.map((c) => ({ value: c, label: c })),
                  ]}
                />
                <Select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setOffset(0);
                  }}
                  options={[
                    { value: '', label: 'Semua Status On-Chain' },
                    { value: 'CONFIRMED', label: 'Tercatat On-Chain' },
                    { value: 'PENDING_BLOCKCHAIN', label: 'Menunggu Pencatatan' },
                    { value: 'REVOKED', label: 'Dicabut On-Chain' },
                  ]}
                />
              </div>
            </div>

            {txQuery.isPending ? (
              <div className="p-5">
                <Skeleton lines={8} />
              </div>
            ) : txQuery.isError ? (
              <div className="p-5">
                <ErrorState message="Gagal memuat daftar transaksi." retry={retry} />
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Tidak ada transaksi pada filter ini"
                  description="Longgarkan filter pencarian atau catat penyaluran baru."
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">ID & Waktu</th>
                        <th className="px-4 py-3 font-semibold">Penerima & Kategori</th>
                        <th className="px-4 py-3 font-semibold">Wilayah</th>
                        <th className="px-4 py-3 font-semibold text-right">Nilai</th>
                        <th className="px-4 py-3 font-semibold">On-Chain & Bukti</th>
                        <th className="px-4 py-3 font-semibold text-right">Inspeksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((t) => {
                        const chainBadge = statusBadge(t.blockchain_status ?? 'PENDING_BLOCKCHAIN');
                        const proofSt = statusBadge(t.proof_status ?? 'PENDING');
                        return (
                          <tr key={t.id} className="hover:bg-cream/60">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="font-mono font-bold text-forest-dark block">#{t.id}</span>
                              <span className="text-[11px] text-slate-500">{formatDateTime(t.timestamp)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-forest-dark inline-flex items-center gap-1.5">
                                {t.recipient_name || '-'}
                                {Number(t.anomaly_flag) === 1 && (
                                  <AlertTriangle size={13} className="text-danger shrink-0" />
                                )}
                              </span>
                              <span className="block text-xs text-slate-500">{t.category || 'Umum'}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">{t.region || '-'}</td>
                            <td className="px-4 py-3 text-right font-bold text-forest-dark tabular-nums whitespace-nowrap">
                              {formatIDR(t.amount)}
                            </td>
                            <td className="px-4 py-3 space-y-1">
                              <div className="flex flex-wrap gap-1">
                                <Badge tone={chainBadge.tone}>{chainBadge.label}</Badge>
                                <Badge tone={t.proof_url ? proofSt.tone : 'danger'}>
                                  {t.proof_url ? proofSt.label : 'Tanpa Berkas'}
                                </Badge>
                              </div>
                              <p className="font-mono text-[11px] text-slate-400">
                                {shortHash(t.tx_hash || t.audit_hash)}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => setDrawerTxId(t.id)}
                              >
                                <Eye size={13} /> Detail
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  total={totalTx}
                  limit={limit}
                  offset={offset}
                  onOffsetChange={setOffset}
                  onLimitChange={setLimit}
                />
              </>
            )}
            <div className="px-4 py-3 bg-cream border-t border-slate-100 text-xs text-slate-500">
              {ON_CHAIN_NOTE}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card>
            <h2 className="text-base font-bold text-forest-dark mb-4">Distribusi per Kategori</h2>
            {categoryData.length === 0 ? (
              <EmptyState
                title="Belum ada data kategori"
                description="Grafik kategori muncul setelah ada laporan disetujui."
              />
            ) : (
              <>
                <div className="h-[190px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((item, index) => (
                          <Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12 }}
                        formatter={(value) => formatIDR(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-2">
                  {categoryData.map((cat, i) => (
                    <div key={cat.name} className="flex justify-between text-xs sm:text-sm">
                      <span className="flex items-center gap-2 text-forest-dark">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        {cat.name}
                      </span>
                      <span className="font-bold text-forest-dark tabular-nums">{formatIDR(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card className="space-y-3">
            <h2 className="text-base font-bold text-forest-dark flex items-center gap-2">
              <Link2 className="text-primary" size={18} /> Ringkasan Halaman Aktif
            </h2>
            <div className="flex justify-between items-center p-3 bg-cream rounded-xl text-xs sm:text-sm">
              <span className="text-slate-600">Menunggu Pencatatan On-Chain</span>
              <Badge tone={pendingBlockchain > 0 ? 'warning' : 'success'}>
                {formatNumber(pendingBlockchain)}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-cream rounded-xl text-xs sm:text-sm">
              <span className="text-slate-600">Ditandai Anomali</span>
              <Badge tone={anomaliesOnPage > 0 ? 'danger' : 'success'}>
                {formatNumber(anomaliesOnPage)}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Total donasi dihitung dari tabel donasi berstatus <strong>Terkonfirmasi</strong>. Distribusi terverifikasi mencakup laporan dengan bukti disetujui dan hash tercatat on-chain.
            </p>
          </Card>
        </div>
      </div>

      <TransactionDetailDrawer
        transactionId={drawerTxId}
        onClose={() => setDrawerTxId(null)}
        onUpdated={retry}
      />
    </div>
  );
};

export default Dashboard;
