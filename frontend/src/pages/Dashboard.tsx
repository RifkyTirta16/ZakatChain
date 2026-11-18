import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Search, TrendingUp, Wallet, AlertTriangle, Link2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  MetricCard, AlertBox, LoadingState, ErrorState, EmptyState, StatusBadge,
} from '../components/wattvision/UIComponents';
import { blockchainTone } from '../utils/status';
import apiClient from '../utils/api';
import { formatIDR, formatNumber, formatDateTime, formatDateKey, shortHash } from '../utils/format';

interface DashboardStats {
  kpis: {
    totalDonations: number;
    totalDistributed: number;
    totalReports: number;
    verifiedReports: number;
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

const COLORS = ['#00E5FF', '#32D74B', '#FF453A', '#FACC15', '#A855F7', '#64D2FF'];

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

  if (isLoading) return <LoadingState label="Memuat dasbor…" />;
  if (error) {
    return (
      <ErrorState
        message={(error as { response?: { data?: { error?: string } } })?.response?.data?.error
          || 'Gagal memuat data dasbor. Pastikan backend berjalan di port 5000.'}
        onRetry={retry}
      />
    );
  }

  const stats = statsQuery.data;
  if (!stats) return <EmptyState message="Data dasbor tidak tersedia." />;

  const { kpis } = stats;
  const categoryData = (stats.categoryDistribution || []).map((c) => ({
    name: c.category || 'Tanpa kategori',
    value: Number(c.total) || 0,
  }));

  return (
    <div className="min-h-screen bg-wattvision-bg antialiased text-wattvision-textMain font-sans">
      {/* Gradient background overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-5" 
          style={{ background: 'radial-gradient(circle at 30% 20%, #00E5FF 0%, #121212 50%)' }} />
        <div className="absolute bottom-0 right-0 opacity-5" 
          style={{ background: 'radial-gradient(circle at 70% 80%, #32D74B 0%, #121212 50%)' }} />
      </div>

      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 px-4 md:px-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase italic leading-none bg-clip-text text-transparent bg-gradient-to-r from-wattvision-primary to-cyan-400">
            Dashboard <span className="text-wattvision-primary">Operasional</span>
          </h1>
          <p className="text-wattvision-textSecondary text-xs uppercase tracking-widest font-medium mt-2">
            Sumber: GET /api/dashboard/stats dan GET /api/transactions (data aktual dari backend)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 bg-wattvision-surface border border-wattvision-border rounded-full text-wattvision-textSecondary">
            <div className="w-2 h-2 bg-wattvision-success rounded-full" />
            API aktif · muat ulang otomatis 30 dtk
          </div>
          <button
            onClick={retry}
            disabled={statsQuery.isFetching || txQuery.isFetching}
            className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold px-4 py-2 rounded-lg border border-wattvision-border text-wattvision-textSecondary hover:border-wattvision-primary hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={(statsQuery.isFetching || txQuery.isFetching) ? 'animate-spin' : ''} />
            Segarkan
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 px-4 md:px-6">
        <MetricCard
          title="Total Donasi Masuk"
          value={formatIDR(kpis.totalDonations)}
          color="primary"
          secondaryValue="Pembayaran berstatus PAID"
        />
        <MetricCard
          title="Total Terdistribusi"
          value={formatIDR(kpis.totalDistributed)}
          color="success"
          secondaryValue="On-chain CONFIRMED & bukti APPROVED"
        />
        <MetricCard
          title="Saldo Net"
          value={formatIDR(kpis.balance)}
          color={kpis.balance >= 0 ? 'success' : 'alert'}
          secondaryValue="Donasi dikonfirmasi − distribusi terverifikasi"
        />
        <MetricCard
          title="Laporan On-Chain"
          value={formatNumber(kpis.verifiedReports)}
          unit={`/ ${formatNumber(kpis.totalReports)} laporan`}
          color="primary"
          secondaryValue="Terkonfirmasi di kontrak / total laporan"
        />
        <MetricCard
          title="Anomali Terbuka"
          value={formatNumber(kpis.openAnomalies)}
          unit="isu"
          color={kpis.openAnomalies > 0 ? 'alert' : 'neutral'}
          secondaryValue="Tercatat pada tabel anomali backend"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-wattvision-surface border border-wattvision-border rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="text-wattvision-primary" size={20} /> Nilai Distribusi per Hari
              </h3>
              <span className="flex items-center gap-2 text-[10px] font-mono text-wattvision-textSecondary uppercase tracking-widest">
                Dihitung dari seluruh transaksi
              </span>
            </div>
            {dailyFlow.length === 0 ? (
              <EmptyState message="Belum ada transaksi untuk ditampilkan." />
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyFlow}>
                    <defs>
                      <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" vertical={false} />
                    <XAxis dataKey="date" stroke="#98989D" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#98989D"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => formatNumber(v)}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2C2C2E', color: '#FFF' }}
                      formatter={(value) => [formatIDR(Number(value)), 'Nilai laporan']}
                    />
                    <Area type="monotone" dataKey="total" stroke="#00E5FF" strokeWidth={2} fillOpacity={1} fill="url(#colorVol)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-wattvision-surface border border-wattvision-border rounded-3xl p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold">Tabel Transaksi</h3>
              <span className="text-[10px] font-mono text-wattvision-textSecondary uppercase tracking-widest">
                {filteredTransactions.length} / {transactions.length} baris
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-wattvision-textSecondary" size={14} />
                <input
                  type="text"
                  placeholder="Cari nama, hash…"
                  className="w-full bg-wattvision-bg border border-wattvision-border pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:border-wattvision-primary transition-colors"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="bg-wattvision-bg border border-wattvision-border px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-wattvision-primary"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                className="bg-wattvision-bg border border-wattvision-border px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-wattvision-primary"
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
              >
                <option value="">Semua Wilayah</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select
                className="bg-wattvision-bg border border-wattvision-border px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-wattvision-primary"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PENDING_BLOCKCHAIN">Pending Blockchain</option>
              </select>
            </div>

            {txQuery.isLoading ? (
              <LoadingState label="Memuat transaksi…" />
            ) : txQuery.isError ? (
              <ErrorState
                message="Gagal memuat daftar transaksi."
                onRetry={retry}
              />
            ) : filteredTransactions.length === 0 ? (
              <EmptyState
                message={transactions.length === 0 ? 'Belum ada transaksi tercatat.' : 'Tidak ada transaksi yang cocok dengan filter.'}
                hint={transactions.length === 0 ? 'Catat distribusi melalui menu Input Distribusi.' : 'Longgarkan pencarian atau filter wilayah/kategori.'}
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-wattvision-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-wattvision-bg text-wattvision-textSecondary uppercase tracking-widest text-[10px]">
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
                    {filteredTransactions.map((t) => (
                      <tr key={t.id} className="border-t border-wattvision-border hover:bg-wattvision-hover transition-colors">
                        <td className="px-3 py-3 font-mono text-wattvision-textSecondary">#{t.id}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-wattvision-textSecondary">{formatDateTime(t.timestamp)}</td>
                        <td className="px-3 py-3">
                          {t.recipient_name || '-'}
                          {Number(t.anomaly_flag) === 1 && (
                            <span className="ml-2 text-wattvision-alert" title={t.anomaly_reason || 'Anomali'}><AlertTriangle size={12} className="shrink-0" /></span>
                          )}
                        </td>
                        <td className="px-3 py-3">{t.category || '-'}</td>
                        <td className="px-3 py-3 whitespace-nowrap">{t.region || '-'}</td>
                        <td className="px-3 py-3 text-right font-mono whitespace-nowrap">{formatIDR(t.amount)}</td>
                        <td className="px-3 py-3">
                          <StatusBadge label={t.blockchain_status || 'TIDAK DIKETAHUI'} tone={blockchainTone(t.blockchain_status)} />
                        </td>
                        <td className="px-3 py-3">
                          {t.proof_url ? (
                            <span className="text-wattvision-success font-mono text-[10px] uppercase" title="Berkas tersimpan di folder uploads backend">
                              Ada berkas
                            </span>
                          ) : (
                            <span className="text-wattvision-alert text-[10px] uppercase">Tidak ada</span>
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono text-wattvision-textSecondary whitespace-nowrap" title={t.tx_hash || ''}>
                          {shortHash(t.tx_hash)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-wattvision-surface border border-wattvision-border rounded-3xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Link2 className="text-wattvision-primary" size={20} /> Status Integrasi
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-wattvision-bg rounded-xl border border-wattvision-border">
                <span className="text-sm text-wattvision-textSecondary">Laporan menunggu blockchain</span>
                <span className={`font-bold text-xs font-mono ${pendingBlockchain > 0 ? 'text-yellow-400' : 'text-wattvision-success'}`}>
                  {pendingBlockchain}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-wattvision-bg rounded-xl border border-wattvision-border">
                <span className="text-sm text-wattvision-textSecondary">Anomali tanpa bukti</span>
                <span className={`font-bold text-xs font-mono ${anomalies.length > 0 ? 'text-wattvision-alert' : 'text-wattision-success'}`}>
                  {anomalies.length}
                </span>
              </div>
              <p className="text-[10px] text-wattvision-textSecondary font-mono leading-relaxed uppercase tracking-wider">
                Angka dihitung dari daftar transaksi. Pemeriksaan kontrak dilakukan backend saat input & rekonsiliasi.
              </p>
              {anomalies.length > 0 && (
                <AlertBox
                  message={`${anomalies.length} laporan tidak memiliki bukti penyaluran.`}
                  type="danger"
                />
              )}
            </div>
          </div>

          <div className="bg-wattvision-surface border border-wattvision-border rounded-3xl p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Wallet className="text-wattvision-success" size={20} /> Catatan Metodologi
            </h3>
            <ul className="text-xs text-wattvision-textSecondary space-y-2 leading-relaxed">
              <li>• Total donasi = jumlah pembayaran berstatus <span className="font-mono text-white">PAID</span> (tabel payments).</li>
              <li>• Total terdistribusi = laporan on-chain <span className="font-mono text-white">CONFIRMED</span> dengan bukti <span className="font-mono text-white">APPROVED</span>.</li>
              <li>• Skor prioritas wilayah dihitung di backend dari tingkat kemiskinan dan jangkauan distribusi.</li>
            </ul>
            {kpis.openAnomalies > 0 && (
              <div className="mt-4 flex items-start gap-2 text-xs text-wattvision-alert">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{kpis.openAnomalies} anomali terbuka memerlukan tindak lanjut.</span>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-wattvision-surface border border-wattvision-border rounded-3xl p-6">
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
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2C2C2E', color: '#FFF' }}
                      formatter={(value) => formatIDR(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-2">
              {categoryData.map((cat, i) => (
                <div key={cat.name} className="flex justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {cat.name}
                  </span>
                  <span className="font-mono font-bold">{formatIDR(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-wattvision-surface border border-wattvision-border rounded-3xl p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Link2 className="text-wattvision-primary" size={20} /> Status Integrasi
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-wattvision-bg rounded-xl border border-wattvision-border">
                <span className="text-sm text-wattvision-textSecondary">Laporan menunggu blockchain</span>
                <span className={`font-bold text-xs font-mono ${pendingBlockchain > 0 ? 'text-yellow-400' : 'text-wattvision-success'}`}>
                  {pendingBlockchain}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-wattvision-bg rounded-xl border border-wattvision-border">
                <span className="text-sm text-wattvision-textSecondary">Anomali tanpa bukti</span>
                <span className={`font-bold text-xs font-mono ${anomalies.length > 0 ? 'text-wattvision-alert' : 'text-wattision-success'}`}>
                  {anomalies.length}
                </span>
              </div>
              <p className="text-[10px] text-wattvision-textSecondary font-mono leading-relaxed uppercase tracking-wider">
                Angka dihitung dari daftar transaksi. Pemeriksaan kontrak dilakukan backend saat input & rekonsiliasi.
              </p>
              {anomalies.length > 0 && (
                <AlertBox
                  message={`${anomalies.length} laporan tidak memiliki bukti penyaluran.`}
                  type="danger"
                />
              )}
            </div>
          </div>

          <div className="bg-wattvision-surface border border-wattvision-border rounded-3xl p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Wallet className="text-wattvision-success" size={20} /> Catatan Metodologi
            </h3>
            <ul className="text-xs text-wattvision-textSecondary space-y-2 leading-relaxed">
              <li>• Total donasi = jumlah pembayaran berstatus <span className="font-mono text-white">PAID</span> (tabel payments).</li>
              <li>• Total terdistribusi = laporan on-chain <span className="font-mono text-white">CONFIRMED</span> dengan bukti <span className="font-mono text-white">APPROVED</span>.</li>
              <li>• Skor prioritas wilayah dihitung di backend dari tingkat kemiskinan dan jangkauan distribusi.</li>
            </ul>
            {kpis.openAnomalies > 0 && (
              <div className="mt-4 flex items-start gap-2 text-xs text-wattvision-alert">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{kpis.openAnomalies} anomali terbuka memerlukan tindak lanjut.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;