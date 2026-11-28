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
import {
  CheckCircle2,
  Copy,
  Download,
  HeartHandshake,
  Scale,
  Search,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import apiClient from '../../utils/api';
import { getStoredSessionUser } from '../../components/layout/navConfig';
import { formatDateTime, formatIDR, formatNumber, shortHash } from '../../utils/format';
import {
  Badge,
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
} from '../../components/ui';
import { NetworkBadge, useNetworkInfo, usePublicTransparency } from '../../components/ethereum';

interface Campaign {
  id: number;
  title: string;
  target_amount: number;
  current_amount: number;
  status: string;
}

interface PublicDistributionsResponse {
  items: Array<{
    id: number;
    amount: number;
    category: string | null;
    region: string | null;
    timestamp: string;
    audit_hash: string | null;
    tx_hash: string | null;
    blockchain_status: string | null;
    block_number: number | null;
    proof_status: string | null;
  }>;
  total: number;
  limit: number;
  offset: number;
}

const PublicTransparencyPage = () => {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);

  const transparency = usePublicTransparency();
  const network = useNetworkInfo();
  const inWorkspace = Boolean(getStoredSessionUser());
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

  const distributions = useQuery<PublicDistributionsResponse>({
    queryKey: ['public-distributions', limit, offset, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (categoryFilter) params.set('category', categoryFilter);
      const { data } = await apiClient.get<PublicDistributionsResponse>(`/public/distributions?${params.toString()}`);
      return data;
    },
  });

  const handleCopy = (id: number, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1800);
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

  const { kpis, governancePolicy, integrityScorecard, categoryDistribution } = transparency.data;
  const distItems = distributions.data?.items ?? [];
  const distTotal = distributions.data?.total ?? 0;
  const amilPct = governancePolicy?.amilShareMaxPercent ?? 12.5;
  const netPct = governancePolicy?.netProgramMinPercent ?? 87.5;

  const categoryOptions = [
    { value: '', label: 'Semua Kategori' },
    ...categoryDistribution
      .filter((c) => c.category)
      .map((c) => ({ value: c.category as string, label: c.category as string })),
  ];

  const csvUrl = `/api/public/distributions?format=csv${categoryFilter ? `&category=${encodeURIComponent(categoryFilter)}` : ''}`;

  return (
    <div className={wrapperClass}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <SectionHeader
          title="Portal Transparansi Publik"
          subtitle="Pantau arus dana agregat, kebijakan penyaluran, dan catatan audit tanpa membuka data pribadi mustahik."
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <NetworkBadge />
          <Link
            to="/verify"
            className="inline-flex items-center gap-1.5 min-h-[40px] rounded-[10px] bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-forest"
          >
            <Search size={15} /> Cek Laporan / BSZ
          </Link>
        </div>
      </div>

      {/* KPI Utama */}
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
          sublabel="Siap dialokasikan ke mustahik"
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

      {/* Kebijakan Dana & Skor Integritas */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-forest-dark flex items-center gap-2">
                <Scale size={18} className="text-primary" /> Kebijakan Dana &amp; Hak Amil
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {governancePolicy?.shariaReference || 'QS. At-Taubah: 60 & Pedoman Tata Kelola Zakat'}
              </p>
            </div>
            <Badge tone="primary">Transparansi Penuh</Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold tabular-nums">
              <span className="text-forest-dark">Minimal {netPct}% Hak Mustahik</span>
              <span className="text-amber-800">Maks. {amilPct}% Hak Kelola Amil</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
              <div className="h-full bg-primary" style={{ width: `${netPct}%` }} />
              <div className="h-full bg-gold" style={{ width: `${amilPct}%` }} />
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {governancePolicy?.allocationBasis || 'Prioritas penyaluran berbasis 8 Asnaf terverifikasi dan indeks kemiskinan wilayah BPS.'}
          </p>
          <p className="text-[11px] text-slate-500">
            {governancePolicy?.gatewayFeeNote || 'Pembayaran QRIS diproses dalam Rupiah (IDR).'}
          </p>
        </Card>

        <Card className="lg:col-span-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-forest-dark flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" /> Skor Integritas &amp; Tata Kelola
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ringkasan terbuka pemeriksaan bukti, penanganan anomali, dan rekonsiliasi saldo.
              </p>
            </div>
            {integrityScorecard && (
              <Badge tone={statusBadge(integrityScorecard.lastReconciliationStatus).tone}>
                {statusBadge(integrityScorecard.lastReconciliationStatus).label}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-mint/60 border border-primary/15 p-3">
              <p className="text-[11px] text-slate-600">Bukti Disetujui</p>
              <p className="text-lg font-extrabold text-forest-dark tabular-nums mt-0.5">
                {formatNumber(integrityScorecard?.approvedProofCount ?? 0)}
              </p>
            </div>
            <div className="rounded-xl bg-cream border border-slate-200 p-3">
              <p className="text-[11px] text-slate-600">Anomali Selesai</p>
              <p className="text-lg font-extrabold text-forest-dark tabular-nums mt-0.5">
                {formatNumber(integrityScorecard?.resolvedAnomalyCount ?? 0)}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3">
              <p className="text-[11px] text-amber-900">Anomali Terbuka</p>
              <p className="text-lg font-extrabold text-amber-900 tabular-nums mt-0.5">
                {formatNumber(integrityScorecard?.openAnomalyCount ?? 0)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-[11px] text-slate-600">Ditolak / Dicabut</p>
              <p className="text-lg font-extrabold text-slate-800 tabular-nums mt-0.5">
                {formatNumber(integrityScorecard?.revokedOrRejectedCount ?? 0)}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Rekonsiliasi terakhir:{' '}
            <strong className="text-forest-dark">
              {integrityScorecard?.lastReconciliationDate
                ? formatDateTime(integrityScorecard.lastReconciliationDate)
                : 'Belum tercatat'}
            </strong>
          </p>
        </Card>
      </div>

      {/* Grafik Kategori + Program Aktif */}
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

      {/* Tabel Penyaluran Anonim Terpaginasi + Unduh CSV */}
      <Card className="p-0 sm:p-0 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-forest-dark">Daftar Penyaluran Terverifikasi (Anonim / Non-PII)</h2>
            <p className="text-xs text-slate-500 mt-0.5">{ON_CHAIN_NOTE}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Select
              aria-label="Filter kategori penyaluran"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setOffset(0);
              }}
              options={categoryOptions}
            />
            <a
              href={csvUrl}
              download
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-[10px] border border-primary/30 bg-mint px-4 text-xs font-semibold text-forest-dark hover:bg-primary hover:text-white transition-colors shrink-0"
            >
              <Download size={14} /> Unduh CSV Anonim
            </a>
          </div>
        </div>

        {distributions.isPending ? (
          <div className="p-6"><Skeleton lines={6} /></div>
        ) : distItems.length === 0 ? (
          <EmptyState title="Belum ada catatan penyaluran" description="Catatan penyaluran yang lolos pemeriksaan akan tampil di sini." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Laporan &amp; Waktu</th>
                    <th className="px-5 py-3.5 font-semibold">Kategori &amp; Wilayah</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Nominal</th>
                    <th className="px-5 py-3.5 font-semibold">Status Verifikasi</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Periksa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {distItems.map((tx) => {
                    const badge = statusBadge(tx.blockchain_status || tx.proof_status || 'PENDING');
                    const hashVal = tx.audit_hash || tx.tx_hash || '';
                    return (
                      <tr key={tx.id} className="hover:bg-cream/60">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-forest-dark">Laporan #{tx.id}</span>
                          <p className="text-xs text-slate-500">{formatDateTime(tx.timestamp)}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-medium text-forest-dark">{tx.category || 'Umum'}</span>
                          <p className="text-xs text-slate-500">{tx.region || 'Nasional'}</p>
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-forest-dark tabular-nums whitespace-nowrap">
                          {formatIDR(tx.amount)}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                          {hashVal && (
                            <button
                              type="button"
                              onClick={() => handleCopy(tx.id, hashVal)}
                              className="inline-flex items-center gap-1 text-xs font-mono text-slate-500 hover:text-primary"
                              title="Salin hash audit"
                            >
                              <Copy size={12} /> {copiedId === tx.id ? 'Tersalin' : shortHash(hashVal, 6, 4)}
                            </button>
                          )}
                          <Link
                            to={`/verify?query=${encodeURIComponent(String(tx.id))}`}
                            className="text-xs font-semibold text-primary hover:text-forest underline underline-offset-4"
                          >
                            Detail &amp; Bukti
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar
              total={distTotal}
              limit={limit}
              offset={offset}
              onOffsetChange={setOffset}
              onLimitChange={setLimit}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default PublicTransparencyPage;
