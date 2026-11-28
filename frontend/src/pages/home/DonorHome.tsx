import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock,
  Globe,
  Heart,
  MapPin,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, ON_CHAIN_NOTE, Skeleton, StatCard, statusBadge } from '../../components/ui';
import DonationDrawer from '../../components/dashboard/DonationDrawer';
import { useMuzakkiOverview } from '../../components/dashboard/hooks/useDashboardData';
import { formatDateTime, formatIDR } from '../../utils/format';
import type { SessionUser } from '../../components/layout/navConfig';

const DonorHome = ({ user }: { user: SessionUser | null }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);

  const overviewQuery = useMuzakkiOverview(Boolean(user));

  if (overviewQuery.isPending) {
    return (
      <div className="space-y-5">
        <Skeleton lines={4} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton lines={3} />
          <Skeleton lines={3} />
          <Skeleton lines={3} />
        </div>
        <Skeleton lines={8} />
      </div>
    );
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return (
      <ErrorState
        message="Gagal memuat ringkasan akun Muzakki Anda."
        retry={() => void overviewQuery.refetch()}
      />
    );
  }

  const data = overviewQuery.data;
  const firstPending = data.resumablePayments[0] ?? null;

  const openNewDonation = (campaignId: number | null = null) => {
    setResumeSessionId(null);
    setSelectedCampaignId(campaignId);
    setDrawerOpen(true);
  };

  const openResumeDonation = (sessionId: string) => {
    setSelectedCampaignId(null);
    setResumeSessionId(sessionId);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {firstPending && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950">
                Ada pembayaran QRIS yang menunggu penyelesaian ({formatIDR(firstPending.amount)})
              </p>
              <p className="text-xs text-amber-900 mt-0.5">
                {firstPending.campaign_title || 'Zakat Umum'} · Selesaikan pembayaran sebelum sesi kedaluwarsa.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={() => openResumeDonation(firstPending.session_id)}
            className="shrink-0"
          >
            Lanjutkan Bayar QRIS <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {/* Ringkasan Personal Muzakki */}
      <Card variant="highlight" className="p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-primary/20 px-3 py-1 text-xs font-semibold text-forest">
              <ShieldCheck size={13} className="text-primary" /> Ruang Amanah Muzakki
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-forest-dark">
              Assalamu&apos;alaikum, {user?.username || 'Sahabat Muzakki'}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tunaikan zakat dalam Rupiah via QRIS, unduh Bukti Setor Zakat (BSZ), dan pantau sebaran bantuan ke penerima manfaat secara langsung.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Button type="button" variant="primary" size="lg" onClick={() => openNewDonation(null)}>
              <Heart size={16} /> Tunaikan Zakat Sekarang
            </Button>
            <Link
              to="/calculator"
              className="inline-flex items-center justify-center gap-2 min-h-[46px] rounded-[10px] border border-slate-300 bg-white px-4 text-sm font-semibold text-forest-dark hover:bg-mint transition-colors"
            >
              <Calculator size={16} /> Kalkulator Nisab
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Zakat Terkonfirmasi"
          value={formatIDR(data.confirmedTotalAmount)}
          sublabel="Seluruh setoran lunas Anda"
          icon={<Receipt size={18} />}
          tone="emerald"
        />
        <StatCard
          label="Transaksi Selesai"
          value={data.confirmedCount}
          sublabel={data.pendingCount > 0 ? `${data.pendingCount} transaksi menunggu` : 'Semua pembayaran tuntas'}
          icon={<CheckCircle2 size={18} />}
          tone="gold"
        />
        <StatCard
          label="Wilayah Terjangkau"
          value={`${data.impactedRegionsCount} Daerah`}
          sublabel="Berdasarkan penyaluran terverifikasi di pool Anda"
          icon={<MapPin size={18} />}
          tone="neutral"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <Card className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-bold text-forest-dark">Riwayat Terakhir Anda</h2>
            <Link to="/my-donations" className="text-xs font-semibold text-primary hover:underline">
              Lihat Semua →
            </Link>
          </div>

          {data.recentDonations.length === 0 ? (
            <EmptyState
              icon={<Receipt size={22} />}
              title="Belum ada transaksi"
              description="Riwayat zakat dan Bukti Setor Zakat (BSZ) Anda akan tampil di sini."
              action={
                <Button type="button" size="sm" onClick={() => openNewDonation(null)}>
                  Mulai Tunaikan Zakat
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentDonations.map((d) => {
                const st = statusBadge(d.status);
                return (
                  <div key={d.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-forest-dark truncate">
                        {d.campaign_title || 'Zakat Umum'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(d.timestamp)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-forest-dark tabular-nums">
                          {formatIDR(d.amount)}
                        </p>
                        <Badge tone={st.tone} className="mt-0.5">{st.label}</Badge>
                      </div>
                      {d.is_resumable && d.payment_reference ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="gold"
                          onClick={() => openResumeDonation(d.payment_reference as string)}
                        >
                          Bayar
                        </Button>
                      ) : d.status === 'CONFIRMED' ? (
                        <Link
                          to={`/my-donations?open=${d.id}`}
                          className="inline-flex items-center min-h-[34px] rounded-[9px] border border-slate-200 bg-cream px-2.5 text-xs font-semibold text-forest-dark hover:bg-mint"
                        >
                          BSZ
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-bold text-forest-dark">Program Zakat Aktif</h2>
            <Link to="/campaigns" className="text-xs font-semibold text-primary hover:underline">
              Semua Program →
            </Link>
          </div>

          {data.activeCampaigns.length === 0 ? (
            <EmptyState
              title="Belum ada program aktif"
              description="Anda tetap dapat menyalurkan melalui Zakat Umum."
            />
          ) : (
            <div className="space-y-3">
              {data.activeCampaigns.map((c) => {
                const collected = Number(c.collected_amount ?? c.current_amount ?? 0);
                const target = Number(c.target_amount) || 0;
                const pct = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;
                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-slate-200 bg-cream/55 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to={`/campaigns/${c.id}`}
                        className="text-sm font-bold text-forest-dark hover:text-primary line-clamp-1"
                      >
                        {c.title}
                      </Link>
                      <span className="text-xs font-bold text-primary tabular-nums shrink-0">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200/80 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-slate-600 tabular-nums">
                        Terkumpul <strong className="text-forest-dark">{formatIDR(collected)}</strong> dari {formatIDR(target)}
                      </span>
                      <Button type="button" size="sm" variant="primary" onClick={() => openNewDonation(c.id)}>
                        Salurkan
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-cream/70">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-forest-dark flex items-center gap-2">
            <Globe size={16} className="text-primary" /> Transparansi &amp; Verifikasi Publik
          </h2>
          <p className="text-xs text-slate-600">{ON_CHAIN_NOTE}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            to="/transparency"
            className="inline-flex items-center gap-1 min-h-[38px] rounded-[10px] border border-primary/30 bg-white px-3.5 text-xs font-semibold text-forest-dark hover:bg-mint"
          >
            Portal Transparansi <ArrowRight size={13} />
          </Link>
          <Link
            to="/verify"
            className="inline-flex items-center gap-1 min-h-[38px] rounded-[10px] bg-primary px-3.5 text-xs font-semibold text-white hover:bg-forest"
          >
            <ShieldCheck size={13} /> Cek BSZ / Laporan
          </Link>
        </div>
      </Card>

      <DonationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialCampaignId={selectedCampaignId}
        resumeSessionId={resumeSessionId}
      />
    </div>
  );
};

export default DonorHome;
