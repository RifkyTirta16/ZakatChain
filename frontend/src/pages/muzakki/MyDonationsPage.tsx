import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Heart, Receipt, ShieldCheck } from 'lucide-react';
import { Badge, Card, EmptyState, ErrorState, ON_CHAIN_NOTE, SectionHeader, Skeleton, StatCard } from '../../components/ui';
import { useDonorDonations } from '../../components/dashboard/hooks/useDashboardData';
import { formatDateTime, formatIDR } from '../../utils/format';
import type { SessionUser } from '../../components/layout/navConfig';

const STATUS_BADGE: Record<string, { tone: 'success' | 'warning' | 'danger'; label: string }> = {
  CONFIRMED: { tone: 'success', label: 'Terkonfirmasi' },
  PENDING: { tone: 'warning', label: 'Menunggu' },
  FAILED: { tone: 'danger', label: 'Gagal' },
};

const MyDonationsPage = ({ user }: { user: SessionUser | null }) => {
  const donorId = user?.id ?? null;
  const query = useDonorDonations(donorId);
  const [filter, setFilter] = useState('');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

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

  const all = (query.data ?? []) as Array<{
    id: number;
    campaign_id: number | null;
    amount: number;
    status: string;
    payment_reference?: string | null;
    timestamp: string;
  }>;

  const confirmedTotal = all
    .filter((d) => d.status === 'CONFIRMED')
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const visible = filter ? all.filter((d) => d.status === filter) : all;

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Riwayat & Bukti Pembayaran"
          subtitle="Daftar zakat dan donasi program yang tercatat atas akun Anda."
        />
        <Link
          to="/donate"
          className="inline-flex items-center justify-center gap-2 min-h-[42px] rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-forest shrink-0"
        >
          <Heart size={15} /> Tunaikan Zakat Baru
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
          label="Status Menunggu"
          value={all.filter((d) => d.status === 'PENDING').length}
          icon={<ShieldCheck size={18} />}
          tone="neutral"
        />
      </div>

      <Card className="p-0 sm:p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-forest-dark">Daftar Kuitansi Pembayaran</h2>
          <select
            aria-label="Filter status pembayaran"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="min-h-[38px] rounded-[10px] border border-slate-300 bg-white px-3 text-xs font-semibold text-forest-dark"
          >
            <option value="">Semua Status</option>
            <option value="CONFIRMED">Terkonfirmasi</option>
            <option value="PENDING">Menunggu</option>
            <option value="FAILED">Gagal</option>
          </select>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={<Receipt size={24} />}
            title="Belum ada riwayat pembayaran"
            description="Pembayaran yang Anda buat untuk program zakat akan tampil di sini."
            action={
              <Link
                to="/campaigns"
                className="inline-flex items-center min-h-[40px] rounded-[10px] bg-primary px-4 text-xs font-semibold text-white"
              >
                Jelajahi Program Zakat
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">ID & Waktu</th>
                  <th className="px-5 py-3.5 font-semibold">Program</th>
                  <th className="px-5 py-3.5 font-semibold">Referensi Pembayaran</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Nominal</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((d) => {
                  const st = STATUS_BADGE[d.status] ?? { tone: 'warning', label: d.status };
                  const ref = d.payment_reference ?? `DON-${d.id}`;
                  return (
                    <tr key={d.id} className="hover:bg-cream/60">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-forest-dark">#{d.id}</span>
                        <p className="text-xs text-slate-500">{formatDateTime(d.timestamp)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {d.campaign_id ? (
                          <Link
                            to={`/campaigns/${d.campaign_id}`}
                            className="font-semibold text-primary hover:underline"
                          >
                            Program #{d.campaign_id}
                          </Link>
                        ) : (
                          <span>Zakat Umum</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                        <div className="inline-flex items-center gap-1.5">
                          <span>{ref}</span>
                          <button
                            type="button"
                            onClick={() => copyRef(ref)}
                            aria-label="Salin referensi"
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-primary"
                          >
                            {copiedRef === ref ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-forest-dark tabular-nums whitespace-nowrap">
                        {formatIDR(Number(d.amount))}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-500">{ON_CHAIN_NOTE}</p>
    </div>
  );
};

export default MyDonationsPage;
