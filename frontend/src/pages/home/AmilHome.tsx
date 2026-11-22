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
  proofBadge,
} from '../../components/ui';
import type { Transaction } from '../Dashboard';

interface AmilDonation {
  id: number;
  campaign_id: number | null;
  campaign_title?: string | null;
  amount: number;
  payment_reference?: string | null;
  status: string;
  timestamp: string;
}

interface MustahikLite {
  id: number;
  verification_status: string;
}

const isOpen = (t: Transaction): boolean =>
  t.proof_status === null || ['DRAFT', 'PENDING', 'PENDING_BLOCKCHAIN'].includes(t.proof_status);

const isRejected = (t: Transaction): boolean =>
  ['REJECTED', 'ANOMALY'].includes(t.proof_status ?? '') || t.anomaly_flag === 1;

const AmilHome = () => {
  const txQuery = useQuery<Transaction[]>({
    queryKey: ['amil-transactions'],
    queryFn: async () => {
      const { data } = await apiClient.get<Transaction[]>('/transactions');
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30_000,
  });

  const donationsQuery = useQuery<AmilDonation[]>({
    queryKey: ['amil-donations'],
    queryFn: async () => {
      const { data } = await apiClient.get<AmilDonation[]>('/donations');
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30_000,
  });

  const mustahikQuery = useQuery<MustahikLite[]>({
    queryKey: ['amil-mustahik'],
    queryFn: async () => {
      const { data } = await apiClient.get<MustahikLite[]>('/mustahik');
      return Array.isArray(data) ? data : [];
    },
  });

  const transactions = txQuery.data ?? [];
  const donations = donationsQuery.data ?? [];
  const mustahik = mustahikQuery.data ?? [];

  const open = transactions.filter(isOpen);
  const rejected = transactions.filter(isRejected);
  const validDistributions = transactions.filter(
    (t) => t.proof_status !== 'REJECTED' && t.blockchain_status !== 'REVOKED',
  );
  const totalDistributed = validDistributions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const confirmedDonations = donations.filter((d) => d.status === 'CONFIRMED');
  const confirmedIncomingTotal = confirmedDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const verifiedMustahikCount = mustahik.filter((m) => m.verification_status === 'VERIFIED').length;
  const recent = transactions.slice(0, 6);

  if (txQuery.isError) {
    return (
      <ErrorState
        message="Gagal memuat catatan distribusi Amil. Periksa koneksi ke server."
        retry={() => {
          void txQuery.refetch();
          void donationsQuery.refetch();
        }}
      />
    );
  }

  const loading = txQuery.isPending || donationsQuery.isPending;

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
              value={formatIDR(confirmedIncomingTotal)}
              sublabel={`${confirmedDonations.length} setoran terkonfirmasi`}
              icon={<HeartHandshake size={18} />}
              tone="emerald"
            />
            <StatCard
              label="Total Tersalurkan"
              value={formatIDR(totalDistributed)}
              sublabel={`${validDistributions.length} laporan valid`}
              icon={<ClipboardList size={18} />}
              tone="forest"
            />
            <StatCard
              label="Mustahik Terverifikasi"
              value={`${verifiedMustahikCount} penerima`}
              sublabel={`Dari ${mustahik.length} terdaftar`}
              icon={<Users size={18} />}
              tone="gold"
            />
            <StatCard
              label="Antrean / Ditolak"
              value={`${open.length} / ${rejected.length}`}
              sublabel="Menunggu tinjauan vs ditolak"
              icon={<AlertTriangle size={18} />}
              tone={rejected.length > 0 ? 'danger' : 'neutral'}
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
                    const badge = proofBadge(t.proof_status ?? t.blockchain_status ?? 'PENDING');
                    return (
                      <div key={t.id} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-sm">
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
                      </div>
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
                  {donations.slice(0, 6).map((d) => (
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
                        <Badge tone={d.status === 'CONFIRMED' ? 'success' : 'warning'}>
                          {d.status === 'CONFIRMED' ? 'Terkonfirmasi' : d.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AmilHome;
