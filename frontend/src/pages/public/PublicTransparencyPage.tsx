import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, Copy, HeartHandshake, Search, ShieldCheck, Wallet } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime, formatIDR, formatNumber, shortHash } from '../../utils/format';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ON_CHAIN_NOTE,
  SectionHeader,
  Skeleton,
  StatCard,
  proofBadge,
} from '../../components/ui';
import { NetworkBadge, useNetworkInfo, usePublicTransparency } from '../../components/ethereum';

interface Campaign {
  id: number;
  title: string;
  target_amount: number;
  current_amount: number;
  status: string;
}

const PublicTransparencyPage = () => {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const transparency = usePublicTransparency();
  const network = useNetworkInfo();
  const inWorkspace = Boolean(localStorage.getItem('zakat_token') && localStorage.getItem('zakat_user'));
  const wrapperClass = inWorkspace
    ? 'space-y-6'
    : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8';
  const campaigns = useQuery<Campaign[]>({
    queryKey: ['public-campaigns'],
    queryFn: async () => {
      const { data } = await apiClient.get<Campaign[]>('/campaigns');
      return Array.isArray(data) ? data : [];
    },
  });

  const handleCopy = (id: number, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (transparency.isPending) {
    return (
      <div className={wrapperClass}>
        <Skeleton lines={3} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton lines={3} />
          <Skeleton lines={3} />
          <Skeleton lines={3} />
          <Skeleton lines={3} />
        </div>
        <Skeleton lines={10} />
      </div>
    );
  }

  if (transparency.isError || !transparency.data) {
    return (
      <div className={wrapperClass}>
        <ErrorState
          message="Gagal memuat data transparansi publik dari server."
          retry={() => void transparency.refetch()}
        />
      </div>
    );
  }

  const { kpis, categoryDistribution, recentTransactions } = transparency.data;

  return (
    <div className={wrapperClass}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <SectionHeader
          title="Portal Transparansi Publik"
          subtitle="Pantau arus dana agregat, kategori penyaluran, dan catatan hash on-chain tanpa membuka data pribadi mustahik."
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <NetworkBadge />
          <Link
            to="/verify"
            className="inline-flex items-center gap-1.5 min-h-[40px] rounded-[10px] bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-forest"
          >
            <Search size={15} /> Verifikasi Hash
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Dana Terkumpul"
          value={formatIDR(kpis.totalDonations)}
          sublabel="Donasi status terkonfirmasi"
          icon={<HeartHandshake size={20} />}
          tone="emerald"
        />
        <StatCard
          label="Dana Tersalurkan"
          value={formatIDR(kpis.totalDistributed)}
          sublabel="Bukti disetujui & tercatat on-chain"
          icon={<CheckCircle2 size={20} />}
          tone="forest"
        />
        <StatCard
          label="Saldo Tersedia"
          value={formatIDR(kpis.balance)}
          sublabel="Selisih donasi vs penyaluran"
          icon={<Wallet size={20} />}
          tone="gold"
        />
        <StatCard
          label="Laporan Terverifikasi"
          value={`${formatNumber(kpis.verifiedReports)} / ${formatNumber(kpis.totalReports)}`}
          sublabel={`Kontrak: ${shortHash(network.contractAddress, 6, 4)}`}
          icon={<ShieldCheck size={20} />}
          tone="neutral"
        />
      </div>

      {/* Category Chart + Active Programs */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7 space-y-4">
          <h2 className="text-lg font-bold text-forest-dark">Distribusi Dana per Kategori</h2>
          {categoryDistribution.length === 0 ? (
            <EmptyState title="Belum ada data kategori" description="Kategori akan muncul setelah ada laporan distribusi." />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryDistribution} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="category" tick={{ fill: '#334155', fontSize: 12 }} />
                  <YAxis
                    width={72}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickFormatter={(v) => {
                      const n = Number(v);
                      if (n >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}jt`;
                      return `Rp${Math.round(n / 1000)}rb`;
                    }}
                  />
                  <Tooltip
                    formatter={(val) => formatIDR(Number(val))}
                    contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0' }}
                  />
                  <Bar dataKey="total" name="Total Disalurkan" fill="#047857" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-forest-dark">Ringkasan Program</h2>
            <Link to="/campaigns" className="text-xs font-semibold text-primary hover:text-forest">
              Lihat Semua
            </Link>
          </div>
          <div className="space-y-3">
            {(campaigns.data ?? []).slice(0, 4).map((c) => {
              const pct = c.target_amount > 0 ? Math.min(100, Math.round((c.current_amount / c.target_amount) * 100)) : 0;
              return (
                <Link
                  key={c.id}
                  to={`/campaigns/${c.id}`}
                  className="block rounded-xl border border-slate-200/80 p-3.5 hover:bg-cream transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-forest-dark truncate">{c.title}</span>
                    <span className="text-xs font-bold text-primary tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-1.5">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {formatIDR(c.current_amount)} dari {formatIDR(c.target_amount)}
                  </p>
                </Link>
              );
            })}
            {(campaigns.data ?? []).length === 0 && (
              <p className="text-sm text-slate-500">Belum ada program terdaftar.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Anonymized Distribution Table */}
      <Card className="p-0 sm:p-0 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-forest-dark">Catatan Penyaluran Terverifikasi Terbaru</h2>
            <p className="text-xs text-slate-500 mt-0.5">{ON_CHAIN_NOTE}</p>
          </div>
        </div>
        {recentTransactions.length === 0 ? (
          <EmptyState title="Belum ada transaksi" description="Catatan distribusi yang sudah direkam akan tampil di sini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">ID</th>
                  <th className="px-5 py-3.5 font-semibold">Kategori & Wilayah</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Nominal</th>
                  <th className="px-5 py-3.5 font-semibold">Hash Audit</th>
                  <th className="px-5 py-3.5 font-semibold">Status Blockchain</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Periksa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx) => {
                  const badge = proofBadge(tx.blockchain_status || tx.proof_status || 'PENDING');
                  const hashVal = tx.audit_hash || tx.tx_hash || '';
                  return (
                    <tr key={tx.id} className="hover:bg-cream/60">
                      <td className="px-5 py-3.5 font-bold text-forest-dark whitespace-nowrap">
                        #{tx.id}
                        <p className="text-xs font-normal text-slate-500">{formatDateTime(tx.timestamp)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-forest-dark">{tx.category || 'Umum'}</span>
                        <p className="text-xs text-slate-500">{tx.region || 'Nasional'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-forest-dark tabular-nums whitespace-nowrap">
                        {formatIDR(tx.amount)}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                        {hashVal ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span>{shortHash(hashVal, 8, 6)}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(tx.id, hashVal)}
                              aria-label="Salin hash audit"
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-primary"
                            >
                              <Copy size={13} />
                            </button>
                            {copiedId === tx.id && (
                              <span className="text-[11px] font-sans font-semibold text-primary">Tersalin</span>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Link
                          to={`/verify?id=${tx.id}`}
                          className="text-xs font-semibold text-primary hover:text-forest underline underline-offset-4"
                        >
                          Detail & Bukti
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PublicTransparencyPage;
