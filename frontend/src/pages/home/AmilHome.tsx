import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ClipboardList, FilePlus, HeartHandshake, Map, Megaphone, Users } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime, formatIDR } from '../../utils/format';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ON_CHAIN_NOTE,
  SectionHeader,
  Skeleton,
  StatCard,
  statusBadge,
} from '../../components/ui';
import type { Transaction } from '../Dashboard';
import { TransactionDetailDrawer } from '../../components/admin/TransactionDetailDrawer';

interface AmilDonation {
  id: number;
  campaign_id: number | null;
  campaign_title?: string | null;
  amount: number;
  payment_reference?: string | null;
  status: string;
  timestamp: string;
}

interface PaginatedEnvelope<T> {
  items: T[];
  total: number;
}

interface DashboardStatsPayload {
  kpis: {
    totalDonations: number;
    totalDistributed: number;
    totalReports: number;
    verifiedReports: number;
    pendingReports: number;
    openAnomalies: number;
  };
}

const AmilHome = () => {
  const [drawerTxId, setDrawerTxId] = useState<number | null>(null);

  const statsQuery = useQuery<DashboardStatsPayload>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardStatsPayload>('/dashboard/stats');
      return data;
    },
    refetchInterval: 30_000,
  });

  const txQuery = useQuery<PaginatedEnvelope<Transaction>>({
    queryKey: ['amil-transactions'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedEnvelope<Transaction>>('/transactions', {
        params: { meta: '1', limit: 6, offset: 0 },
      });
      return data;
    },
    refetchInterval: 30_000,
  });

  const donationsQuery = useQuery<PaginatedEnvelope<AmilDonation>>({
    queryKey: ['amil-donations'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedEnvelope<AmilDonation>>('/donations', {
        params: { meta: '1', limit: 6, offset: 0 },
      });
      return data;
    },
    refetchInterval: 30_000,
  });

  const verifiedMustahikQuery = useQuery<PaginatedEnvelope<{ id: number }>>({
    queryKey: ['amil-mustahik-verified-count'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedEnvelope<{ id: number }>>('/mustahik', {
        params: { meta: '1', status: 'VERIFIED', limit: 1, offset: 0 },
      });
      return data;
    },
  });

  const allMustahikQuery = useQuery<PaginatedEnvelope<{ id: number }>>({
    queryKey: ['amil-mustahik-all-count'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedEnvelope<{ id: number }>>('/mustahik', {
        params: { meta: '1', limit: 1, offset: 0 },
      });
      return data;
    },
  });

  if (txQuery.isError || statsQuery.isError) {
    return (
      <ErrorState
        message="Gagal memuat catatan distribusi Amil. Periksa koneksi ke server."
        retry={() => {
          void statsQuery.refetch();
          void txQuery.refetch();
          void donationsQuery.refetch();
        }}
      />
    );
  }

  const loading = txQuery.isPending || donationsQuery.isPending || statsQuery.isPending;
  const recent = txQuery.data?.items ?? [];
  const donations = donationsQuery.data?.items ?? [];
  const stats = statsQuery.data?.kpis;
  const verifiedCount = verifiedMustahikQuery.data?.total ?? 0;
  const totalMustahik = allMustahikQuery.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Operasional Amil Zakat"
          subtitle="Kelola penghimpunan dana masuk, data mustahik terverifikasi, program zakat, dan penyaluran multi-wilayah."
        />
        <Link
          to="/new-record"
          className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-[10px] bg-gradient-to-b from-primary-light to-primary px-5 text-sm font-semibold text-white hover:to-forest shadow-teal-glow shrink-0"
        >
          <FilePlus size={16} /> Catat Distribusi Baru
        </Link>
      </div>

      {loading ? (
        <Skeleton lines={8} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Dana Masuk"
              value={formatIDR(stats?.totalDonations ?? 0)}
              sublabel={`${donationsQuery.data?.total ?? donations.length} catatan setoran`}
              icon={<HeartHandshake size={18} />}
              tone="emerald"
            />
            <StatCard
              label="Total Tersalurkan Valid"
              value={formatIDR(stats?.totalDistributed ?? 0)}
              sublabel={`${stats?.verifiedReports ?? 0} dari ${stats?.totalReports ?? 0} laporan valid`}
              icon={<ClipboardList size={18} />}
              tone="forest"
            />
            <StatCard
              label="Mustahik Terverifikasi"
              value={`${verifiedCount} penerima`}
              sublabel={`Dari ${totalMustahik} terdaftar`}
              icon={<Users size={18} />}
              tone="gold"
            />
            <StatCard
              label="Antrean / Anomali"
              value={`${stats?.pendingReports ?? 0} / ${stats?.openAnomalies ?? 0}`}
              sublabel="Tertunda on-chain vs anomali terbuka"
              icon={<AlertTriangle size={18} />}
              tone={(stats?.openAnomalies ?? 0) > 0 ? 'danger' : 'neutral'}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/new-record" className="block">
              <Card className="hover:border-primary/40 transition-colors flex items-center gap-3 p-4 sm:p-5">
                <div className="w-10 h-10 rounded-xl bg-mint border border-primary/15 text-primary flex items-center justify-center shrink-0">
                  <FilePlus size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-dark">Catat Distribusi</p>
                  <p className="text-xs text-slate-500">Bukti & multi-wilayah</p>
                </div>
              </Card>
            </Link>
            <Link to="/mustahik" className="block">
              <Card className="hover:border-primary/40 transition-colors flex items-center gap-3 p-4 sm:p-5">
                <div className="w-10 h-10 rounded-xl bg-mint border border-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Users size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-dark">Data Mustahik</p>
                  <p className="text-xs text-slate-500">Kelola penerima zakat</p>
                </div>
              </Card>
            </Link>
            <Link to="/campaigns" className="block">
              <Card className="hover:border-gold/50 transition-colors flex items-center gap-3 p-4 sm:p-5">
                <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 text-amber-900 flex items-center justify-center shrink-0">
                  <Megaphone size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-dark">Kelola Program</p>
                  <p className="text-xs text-slate-500">Buat & pantau kampanye</p>
                </div>
              </Card>
            </Link>
            <Link to="/mapping" className="block">
              <Card className="hover:border-primary/40 transition-colors flex items-center gap-3 p-4 sm:p-5">
                <div className="w-10 h-10 rounded-xl bg-forest/10 border border-forest/15 text-forest flex items-center justify-center shrink-0">
                  <Map size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-dark">Pemetaan & Impor</p>
                  <p className="text-xs text-slate-500">Prioritas kemiskinan</p>
                </div>
              </Card>
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-7 p-0 sm:p-0 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-forest-dark">Laporan Penyaluran Terbaru</h2>
                <Link to="/explorer" className="text-xs font-semibold text-primary hover:underline">
                  Buka Explorer →
                </Link>
              </div>
              {recent.length === 0 ? (
                <EmptyState
                  icon={<ClipboardList size={24} />}
                  title="Belum ada catatan distribusi"
                  description="Mulai dengan mencatat penyaluran dana zakat pertama Anda."
                  action={
                    <Link
                      to="/new-record"
                      className="inline-flex items-center min-h-[40px] rounded-[10px] bg-primary px-4 text-xs font-semibold text-white"
                    >
                      Catat Distribusi
                    </Link>
                  }
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {recent.map((t) => {
                    const badge = statusBadge(
                      t.blockchain_status === 'REVOKED'
                        ? 'REVOKED'
                        : (t.proof_status ?? t.blockchain_status ?? 'PENDING')
                    );
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setDrawerTxId(t.id)}
                        className="w-full text-left px-5 py-3.5 hover:bg-cream/80 flex flex-wrap items-center justify-between gap-3 text-sm transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-forest-dark">
                            #{t.id} {t.recipient_name || 'Mustahik'} · {t.category || 'Umum'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {t.region || 'Nasional'} · {formatDateTime(t.timestamp)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-forest-dark tabular-nums">
                            {formatIDR(Number(t.amount))}
                          </span>
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="px-5 py-3 bg-cream border-t border-slate-100 text-xs text-slate-500">
                {ON_CHAIN_NOTE}
              </div>
            </Card>

            <Card className="lg:col-span-5 p-0 sm:p-0 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-forest-dark">Donasi Masuk Terbaru</h2>
                <Link to="/campaigns" className="text-xs font-semibold text-primary hover:underline">
                  Lihat Program →
                </Link>
              </div>
              {donations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Belum ada donasi muzakki yang masuk.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {donations.map((d) => {
                    const st = statusBadge(d.status === 'CONFIRMED' ? 'PAID' : d.status);
                    return (
                      <div key={d.id} className="px-5 py-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
                        <div className="min-w-0">
                          <p className="font-semibold text-forest-dark truncate">
                            {d.campaign_title || 'Zakat Umum'}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 truncate">
                            #{d.id} · {d.payment_reference || '-'} · {formatDateTime(d.timestamp)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-forest-dark tabular-nums">{formatIDR(Number(d.amount))}</p>
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      <TransactionDetailDrawer
        transactionId={drawerTxId}
        onClose={() => setDrawerTxId(null)}
        onUpdated={() => {
          void statsQuery.refetch();
          void txQuery.refetch();
        }}
      />
    </div>
  );
};

export default AmilHome;
