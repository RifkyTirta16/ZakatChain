import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FilePlus, RefreshCw, Search, TrendingUp, Wallet, AlertTriangle, Link2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import apiClient from '../utils/api';
import { formatIDR, formatNumber, formatDateTime, formatDateKey, shortHash } from '../utils/format';
import { Card, Badge, Button, Skeleton, EmptyState, ErrorState, proofBadge, ON_CHAIN_NOTE } from '../components/ui';

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
}

/** Nilai warna dari DESIGN.md untuk Recharts (SVG butuh string warna, bukan class Tailwind). */
const CHART = {
  primary: '#047857',
  primaryDark: '#064E3B',
  gold: '#C9A45C',
  coral: '#DC2626',
  sky: '#0284C7',
  grid: '#ECFDF5',
};

const PIE_COLORS = [CHART.primary, CHART.gold, CHART.coral, CHART.sky, CHART.primaryDark];

const fetchStats = async (): Promise<DashboardStats> => {
  const { data } = await apiClient.get('/dashboard/stats');
  return data;
};

const fetchTransactions = async (): Promise<Transaction[]> => {
  const { data } = await apiClient.get('/transactions');
  return data;
};

const Dashboard = () => {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const storedUser = localStorage.getItem('zakat_user');
  let role = '';
  try {
    role = storedUser ? (JSON.parse(storedUser) as { role?: string }).role || '' : '';
  } catch {
    role = '';
  }

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchStats,
    refetchInterval: 30000,
  });

  const txQuery = useQuery({
    queryKey: ['dashboard-transactions'],
    queryFn: fetchTransactions,
    refetchInterval: 30000,
  });

  const transactions = useMemo(() => txQuery.data ?? [], [txQuery.data]);

  const categories = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.category).filter(Boolean))) as string[],
    [transactions]
  );

  const regions = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.region).filter(Boolean))) as string[],
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filterCategory && t.category !== filterCategory) return false;
      if (filterRegion && t.region !== filterRegion) return false;
      if (filterStatus && t.blockchain_status !== filterStatus) return false;
      if (!term) return true;
      return [t.recipient_name, t.donor_name, t.audit_hash, t.region, t.tx_hash]
        .some((field) => (field || '').toLowerCase().includes(term));
    });
  }, [transactions, search, filterCategory, filterRegion, filterStatus]);

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

  const anomalies = useMemo(
    () => transactions.filter((t) => Number(t.anomaly_flag) === 1),
    [transactions]
  );

  const isLoading = statsQuery.isLoading || txQuery.isLoading;
  const error = statsQuery.error || txQuery.error;

  const retry = () => {
    statsQuery.refetch();
    txQuery.refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton lines={4} className="w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n}><Skeleton lines={4} className="w-full rounded-lg" /></Card>
          ))}
        </div>
        <Card><Skeleton lines={10} className="w-full rounded-lg" /></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface p-4 md:p-6 max-w-7xl mx-auto">
        <ErrorState
          message="Gagal memuat data dasbor. Pastikan backend berjalan di port 5000."
          retry={retry}
        />
      </div>
    );
  }

  const stats = statsQuery.data;
  if (!stats) {
    return (
      <div className="min-h-screen bg-surface p-4 md:p-6 max-w-7xl mx-auto">
        <Card>
          <EmptyState
            title="Data dasbor tidak tersedia"
            description="Server merespons tetapi tidak mengirim data."
            action={<Button onClick={retry}>Muat ulang</Button>}
          />
        </Card>
      </div>
    );
  }

  const { kpis } = stats;
  const categoryData = (stats.categoryDistribution || []).map((c) => ({
    name: c.category || 'Tanpa kategori',
    value: Number(c.total) || 0,
  }));

  const primaryAction = role === 'AMIL'
    ? { to: '/new-record', label: 'Catat Distribusi', icon: FilePlus }
    : { to: '/anomalies', label: 'Tinjau Anomali', icon: AlertTriangle };
  const PrimaryIcon = primaryAction.icon;

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary-dark">Dasbor Operasional</h1>
          <p className="text-sm text-primary-dark/70 mt-1">
            Data aktual dari backend, dimuat ulang otomatis tiap 30 detik.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={retry}
            disabled={statsQuery.isFetching || txQuery.isFetching}
            className="inline-flex items-center min-h-[44px] gap-2 rounded-full border-2 border-primary px-5 text-sm font-bold text-primary-dark shadow-teal-glow outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <RefreshCw size={14} className={(statsQuery.isFetching || txQuery.isFetching) ? 'animate-spin' : ''} />
            Segarkan
          </button>
          <Link
            to={primaryAction.to}
            className="inline-flex items-center min-h-[44px] rounded-full bg-gradient-to-br from-gold to-gold-light px-6 font-bold text-sm text-primary-dark shadow-gold-glow outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <PrimaryIcon size={16} className="mr-2" /> {primaryAction.label}
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-primary-dark/70 mb-1">Total Donasi Masuk</p>
          <p className="text-xl font-extrabold text-primary-dark">{formatIDR(kpis.totalDonations)}</p>
          <p className="text-xs text-primary-dark/70 mt-2">Pembayaran berstatus PAID</p>
        </Card>
        <Card>
          <p className="text-sm text-primary-dark/70 mb-1">Total Terdistribusi</p>
          <p className="text-xl font-extrabold text-primary-dark">{formatIDR(kpis.totalDistributed)}</p>
          <p className="text-xs text-primary-dark/70 mt-2">On-chain CONFIRMED &amp; bukti APPROVED</p>
        </Card>
        <Card>
          <p className="text-sm text-primary-dark/70 mb-1">Saldo Net</p>
          <p className={`text-xl font-extrabold ${kpis.balance >= 0 ? 'text-primary-dark' : 'text-coral-dark'}`}>
            {formatIDR(kpis.balance)}
          </p>
          <p className="text-xs text-primary-dark/70 mt-2">Donasi terkonfirmasi &minus; distribusi terverifikasi</p>
        </Card>
        <Card variant={kpis.openAnomalies > 0 ? 'anomaly' : 'default'}>
          <p className="text-sm text-primary-dark/70 mb-1">Anomali Terbuka</p>
          <p className="text-xl font-extrabold text-primary-dark">{formatNumber(kpis.openAnomalies)}</p>
          <p className="text-xs text-primary-dark/70 mt-2">Tercatat pada tabel anomali backend</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-primary-dark flex items-center gap-2">
                <TrendingUp className="text-primary" size={18} /> Nilai Distribusi per Hari
              </h2>
              <span className="text-xs text-primary-dark/70">Dihitung dari seluruh transaksi</span>
            </div>
            {dailyFlow.length === 0 ? (
              <EmptyState
                title="Belum ada transaksi"
                description="Grafik akan tampil setelah ada catatan distribusi."
              />
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyFlow}>
                    <defs>
                      <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="date" stroke={CHART.primaryDark} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke={CHART.primaryDark}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => formatNumber(v)}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', border: `1px solid ${CHART.grid}`, borderRadius: 12, color: CHART.primaryDark }}
                      formatter={(value) => [formatIDR(Number(value)), 'Nilai laporan']}
                    />
                    <Area type="monotone" dataKey="total" stroke={CHART.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorVol)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
              <h2 className="text-base font-bold text-primary-dark">Tabel Transaksi</h2>
              <span className="text-xs text-primary-dark/70">
                {filteredTransactions.length} / {transactions.length} baris
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-dark/50" size={14} />
                <input
                  type="text"
                  placeholder="Cari nama, hash..."
                  className="w-full bg-cream border border-primary-bg pl-9 pr-3 py-2 rounded-xl text-sm text-primary-dark placeholder-primary-dark/50 outline-none focus:ring-2 focus:ring-primary/20"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="bg-cream border border-primary-bg px-3 py-2 rounded-xl text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                className="bg-cream border border-primary-bg px-3 py-2 rounded-xl text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20"
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
              >
                <option value="">Semua Wilayah</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select
                className="bg-cream border border-primary-bg px-3 py-2 rounded-xl text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PENDING_BLOCKCHAIN">Pending Blockchain</option>
              </select>
            </div>

            {txQuery.isError ? (
              <ErrorState message="Gagal memuat daftar transaksi." retry={retry} />
            ) : filteredTransactions.length === 0 ? (
              <EmptyState
                title={transactions.length === 0 ? 'Belum ada transaksi tercatat.' : 'Tidak ada transaksi yang cocok dengan filter.'}
                description={transactions.length === 0 ? 'Catat distribusi melalui menu Catatan Distribusi.' : 'Longgarkan pencarian atau filter wilayah/kategori.'}
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-primary-bg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-primary-bg text-primary-dark text-xs">
                      <th className="px-3 py-3 text-left font-bold">ID</th>
                      <th className="px-3 py-3 text-left font-bold">Waktu</th>
                      <th className="px-3 py-3 text-left font-bold">Penerima</th>
                      <th className="px-3 py-3 text-left font-bold">Kategori</th>
                      <th className="px-3 py-3 text-left font-bold">Wilayah</th>
                      <th className="px-3 py-3 text-right font-bold">Nilai</th>
                      <th className="px-3 py-3 text-left font-bold">Blockchain</th>
                      <th className="px-3 py-3 text-left font-bold">Bukti</th>
                      <th className="px-3 py-3 text-left font-bold">TX Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t) => {
                      const chainBadge = proofBadge(t.blockchain_status ?? '');
                      const proofTone = t.proof_url ? 'success' : 'coral';
                      return (
                        <tr key={t.id} className="border-t border-primary-bg hover:bg-primary-bg/40 transition-colors">
                          <td className="px-3 py-3 text-primary-dark/70">#{t.id}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-primary-dark/70">{formatDateTime(t.timestamp)}</td>
                          <td className="px-3 py-3 text-primary-dark">
                            <span className="inline-flex items-center gap-2">
                              {t.recipient_name || '-'}
                              {Number(t.anomaly_flag) === 1 && (
                                <span title={t.anomaly_reason || 'Anomali'} className="text-coral">
                                  <AlertTriangle size={12} className="shrink-0" />
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-primary-dark">{t.category || '-'}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-primary-dark">{t.region || '-'}</td>
                          <td className="px-3 py-3 text-right whitespace-nowrap text-primary-dark">{formatIDR(t.amount)}</td>
                          <td className="px-3 py-3">
                            <Badge tone={chainBadge.tone}>{chainBadge.label}</Badge>
                          </td>
                          <td className="px-3 py-3">
                            {t.proof_url ? (
                              <Badge tone={proofTone}>Ada berkas</Badge>
                            ) : (
                              <Badge tone={proofTone}>Tidak ada</Badge>
                            )}
                          </td>
                          <td className="px-3 py-3 text-primary-dark/70 whitespace-nowrap" title={t.tx_hash || ''}>
                            {shortHash(t.tx_hash)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-primary-dark/70 mt-3">{ON_CHAIN_NOTE}</p>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card>
            <h2 className="text-base font-bold text-primary-dark mb-4">Distribusi Kategori</h2>
            {categoryData.length === 0 ? (
              <EmptyState
                title="Belum ada data kategori"
                description="Pie kategori akan tampil setelah ada transaksi."
              />
            ) : (
              <>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFFFFF', border: `1px solid ${CHART.grid}`, borderRadius: 12, color: CHART.primaryDark }}
                        formatter={(value) => formatIDR(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-2">
                  {categoryData.map((cat, i) => (
                    <div key={cat.name} className="flex justify-between text-sm">
                      <span className="flex items-center gap-2 text-primary-dark">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        {cat.name}
                      </span>
                      <span className="font-bold text-primary-dark">{formatIDR(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-bold text-primary-dark mb-4 flex items-center gap-2">
              <Link2 className="text-primary" size={18} /> Status Integrasi
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-cream rounded-xl">
                <span className="text-sm text-primary-dark/70">Laporan menunggu blockchain</span>
                <Badge tone={pendingBlockchain > 0 ? 'gold' : 'success'}>{formatNumber(pendingBlockchain)}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-cream rounded-xl">
                <span className="text-sm text-primary-dark/70">Anomali tanpa bukti</span>
                <Badge tone={anomalies.length > 0 ? 'coral' : 'success'}>{formatNumber(anomalies.length)}</Badge>
              </div>
              <p className="text-xs text-primary-dark/70 leading-relaxed">
                Angka dihitung dari daftar transaksi. Pemeriksaan kontrak dilakukan backend saat input &amp; rekonsiliasi.
              </p>
              {anomalies.length > 0 && (
                <div className="p-3 bg-coral/10 border border-coral/30 rounded-xl flex items-center gap-2 text-sm text-coral-dark">
                  <AlertTriangle size={14} className="shrink-0" />
                  {anomalies.length} laporan tidak memiliki bukti penyaluran.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-bold text-primary-dark mb-3 flex items-center gap-2">
              <Wallet className="text-success" size={18} /> Catatan Metodologi
            </h2>
            <ul className="text-sm text-primary-dark/70 space-y-2 leading-relaxed">
              <li>Total donasi = jumlah pembayaran berstatus PAID (tabel payments).</li>
              <li>Total terdistribusi = laporan on-chain CONFIRMED dengan bukti APPROVED.</li>
              <li>Skor prioritas wilayah dihitung di backend dari tingkat kemiskinan dan jangkauan distribusi.</li>
            </ul>
            {kpis.verifiedReports !== undefined && (
              <p className="text-xs text-primary-dark/70 mt-3">
                {formatNumber(kpis.verifiedReports)} / {formatNumber(kpis.totalReports)} laporan terkonfirmasi on-chain.
              </p>
            )}
            {kpis.openAnomalies > 0 && (
              <div className="mt-4 flex items-start gap-2 text-sm text-coral-dark">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{kpis.openAnomalies} anomali terbuka memerlukan tindak lanjut.</span>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
