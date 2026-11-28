import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Copy, Heart, MapPin, QrCode, Receipt, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, ON_CHAIN_NOTE, SectionHeader, Skeleton, StatCard, statusBadge } from '../../components/ui';
import DonationDrawer from '../../components/dashboard/DonationDrawer';
import { DonationReceiptDrawer } from '../../components/payment/DonationReceiptDrawer';
import { useDonorDonations } from '../../components/dashboard/hooks/useDashboardData';
import { formatDateTime, formatIDR } from '../../utils/format';
import type { SessionUser } from '../../components/layout/navConfig';

interface DonationRow {
  id: number;
  campaign_id: number | null;
  campaign_title?: string | null;
  amount: number;
  status: string;
  payment_reference?: string | null;
  is_resumable?: boolean;
  timestamp: string;
}

const FILTER_TABS = [
  { id: '', label: 'Semua' },
  { id: 'CONFIRMED', label: 'Terkonfirmasi' },
  { id: 'PENDING', label: 'Menunggu' },
  { id: 'EXPIRED', label: 'Kedaluwarsa' },
  { id: 'FAILED', label: 'Gagal' },
];

const MyDonationsPage = ({ user }: { user: SessionUser | null }) => {
  const donorId = user?.id ?? null;
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useDonorDonations(donorId);
  const [filter, setFilter] = useState('');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<{ donationId: number; mode: 'trace' | 'bsz' } | null>(null);
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);

  const openParam = searchParams.get('open');
  const urlReceipt = openParam && /^\d+$/.test(openParam)
    ? { donationId: Number(openParam), mode: 'bsz' as const }
    : null;
  const resolvedReceipt = activeReceipt ?? urlReceipt;

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton lines={3} />
        <Skeleton lines={8} />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        message="Gagal memuat riwayat donasi Anda."
        retry={() => void query.refetch()}
      />
    );
  }

  const all = (query.data ?? []) as DonationRow[];
  const confirmedTotal = all
    .filter((d) => d.status === 'CONFIRMED')
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const visible = filter ? all.filter((d) => d.status === filter) : all;

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    window.setTimeout(() => setCopiedRef(null), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Riwayat & Bukti Pembayaran"
          subtitle="Pantau kuitansi resmi (BSZ), lanjutkan pembayaran pending, dan lacak sebaran wilayah zakat Anda."
        />
        <Link
          to="/donate"
          className="inline-flex items-center justify-center gap-2 min-h-[42px] rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-forest shrink-0"
        >
          <Heart size={15} /> Tunaikan Zakat Baru
        </Link>
      </div>

      <div className="no-print grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Terkonfirmasi"
          value={formatIDR(confirmedTotal)}
          icon={<Receipt size={18} />}
          tone="emerald"
        />
        <StatCard
          label="Jumlah Transaksi"
          value={all.length}
          icon={<Heart size={18} />}
          tone="gold"
        />
        <StatCard
          label="Menunggu Pembayaran"
          value={all.filter((d) => d.status === 'PENDING').length}
          icon={<ShieldCheck size={18} />}
          tone="neutral"
        />
      </div>

      <Card className="no-print p-0 sm:p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-forest-dark">Daftar Kuitansi Pembayaran</h2>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_TABS.map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id || 'all'}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`min-h-[34px] rounded-full px-3 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-mint hover:text-forest-dark'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={<Receipt size={24} />}
            title="Belum ada riwayat sesuai filter"
            description="Pembayaran zakat Anda akan tercatat otomatis di sini."
            action={
              <Link
                to="/donate"
                className="inline-flex items-center min-h-[40px] rounded-[10px] bg-primary px-4 text-xs font-semibold text-white"
              >
                Tunaikan Zakat Sekarang
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID & Waktu</th>
                  <th className="px-4 py-3 font-semibold">Program</th>
                  <th className="px-4 py-3 font-semibold">Referensi</th>
                  <th className="px-4 py-3 font-semibold text-right">Nominal</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((d) => {
                  const st = statusBadge(d.status);
                  const ref = d.payment_reference ?? `DON-${d.id}`;
                  return (
                    <tr key={d.id} className="hover:bg-cream/60">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-forest-dark">#{d.id}</span>
                        <p className="text-[11px] text-slate-500">{formatDateTime(d.timestamp)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {d.campaign_id ? (
                          <Link
                            to={`/campaigns/${d.campaign_id}`}
                            className="font-semibold text-primary hover:underline"
                          >
                            {d.campaign_title || `Program #${d.campaign_id}`}
                          </Link>
                        ) : (
                          <span>Zakat Umum</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 max-w-[175px]">
                        <div className="flex items-center gap-1">
                          <span className="truncate" title={ref}>{ref}</span>
                          <button
                            type="button"
                            onClick={() => copyRef(ref)}
                            aria-label="Salin referensi"
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-primary shrink-0"
                          >
                            {copiedRef === ref ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-forest-dark tabular-nums whitespace-nowrap">
                        {formatIDR(Number(d.amount))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                        {d.status === 'CONFIRMED' ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setActiveReceipt({ donationId: d.id, mode: 'trace' })}
                            >
                              <MapPin size={12} /> Jejak
                            </Button>
                            <Button
                              size="sm"
                              variant="gold"
                              onClick={() => setActiveReceipt({ donationId: d.id, mode: 'bsz' })}
                            >
                              <Receipt size={12} /> BSZ
                            </Button>
                          </>
                        ) : d.is_resumable && d.payment_reference ? (
                          <Button
                            size="sm"
                            variant="gold"
                            onClick={() => setResumeSessionId(d.payment_reference as string)}
                          >
                            <QrCode size={12} /> Lanjutkan Bayar
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {d.status === 'EXPIRED' ? 'Buat ulang di Tunaikan Zakat' : 'Tidak tersedia'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="no-print text-xs text-slate-500">{ON_CHAIN_NOTE}</p>

      <DonationReceiptDrawer
        donationId={resolvedReceipt?.donationId ?? null}
        initialMode={resolvedReceipt?.mode ?? 'bsz'}
        username={user?.username}
        onClose={() => {
          setActiveReceipt(null);
          if (searchParams.has('open')) {
            const next = new URLSearchParams(searchParams);
            next.delete('open');
            setSearchParams(next, { replace: true });
          }
        }}
      />

      <DonationDrawer
        isOpen={Boolean(resumeSessionId)}
        onClose={() => setResumeSessionId(null)}
        resumeSessionId={resumeSessionId}
      />
    </div>
  );
};

export default MyDonationsPage;
