import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, Copy, ExternalLink, Heart, MapPin, Printer, Receipt, ShieldCheck, X } from 'lucide-react';
import apiClient from '../../utils/api';
import { Badge, Button, Card, EmptyState, ErrorState, ON_CHAIN_NOTE, SectionHeader, Skeleton, StatCard } from '../../components/ui';
import { useDonorDonations } from '../../components/dashboard/hooks/useDashboardData';
import { formatDateTime, formatIDR, shortHash } from '../../utils/format';
import type { SessionUser } from '../../components/layout/navConfig';

interface DonationRow {
  id: number;
  campaign_id: number | null;
  campaign_title?: string | null;
  amount: number;
  status: string;
  payment_reference?: string | null;
  timestamp: string;
}

interface DonationTraceResponse {
  donation: {
    id: number;
    campaign_id: number | null;
    campaign_title: string | null;
    donor_username: string | null;
    amount: number;
    payment_reference: string | null;
    status: string;
    timestamp: string;
  };
  pool_scope: 'CAMPAIGN_POOL' | 'GENERAL_ZAKAT_POOL';
  pool_distributed_total: number;
  regions: Array<{
    region: string;
    total_distributed: number;
    tx_count: number;
    share_percent: number;
    estimated_allocation_idr: number;
  }>;
  reports: Array<{
    id: number;
    amount: number;
    category: string;
    region: string;
    audit_hash: string | null;
    tx_hash: string | null;
    blockchain_status: string | null;
    timestamp: string;
  }>;
  disclaimer: string;
}

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
  const [activePanel, setActivePanel] = useState<{ donationId: number; mode: 'trace' | 'bsz' } | null>(null);

  const traceQuery = useQuery<DonationTraceResponse>({
    queryKey: ['donation-trace', activePanel?.donationId],
    enabled: activePanel !== null,
    queryFn: async () => {
      const { data } = await apiClient.get<DonationTraceResponse>(`/donations/${activePanel!.donationId}/trace`);
      return data;
    },
  });

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
    setTimeout(() => setCopiedRef(null), 1800);
  };

  const trace = traceQuery.data;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Riwayat & Bukti Pembayaran"
          subtitle="Pantau kuitansi resmi (BSZ) dan sebaran wilayah penyaluran zakat Anda."
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
          label="Status Menunggu"
          value={all.filter((d) => d.status === 'PENDING').length}
          icon={<ShieldCheck size={18} />}
          tone="neutral"
        />
      </div>

      {activePanel && (
        <Card className="bsz-print-card border-primary/30 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-forest-dark flex items-center gap-2">
                {activePanel.mode === 'bsz' ? (
                  <>
                    <Receipt size={18} className="text-primary" /> Bukti Setor Zakat (BSZ) #{activePanel.donationId}
                  </>
                ) : (
                  <>
                    <MapPin size={18} className="text-primary" /> Jejak Alokasi Multi-Wilayah · Donasi #{activePanel.donationId}
                  </>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                {activePanel.mode === 'bsz'
                  ? 'Dokumen tanda terima resmi pembayaran zakat melalui ZakatChain.'
                  : 'Sebaran wilayah penyaluran terverifikasi yang terkait dengan pool dana zakat ini.'}
              </p>
            </div>
            <div className="no-print flex items-center gap-2">
              {activePanel.mode === 'bsz' && trace && (
                <Button size="sm" variant="gold" onClick={() => window.print()}>
                  <Printer size={14} /> Cetak / Simpan PDF
                </Button>
              )}
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Tutup panel"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {traceQuery.isPending ? (
            <Skeleton lines={6} />
          ) : traceQuery.isError || !trace ? (
            <ErrorState
              message="Gagal memuat rincian alokasi donasi."
              retry={() => void traceQuery.refetch()}
            />
          ) : (
            <div className="space-y-5">
              {activePanel.mode === 'bsz' && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 rounded-xl bg-cream p-4 border border-slate-200">
                  <div className="min-w-0">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Nomor BSZ</span>
                    <span className="font-mono text-sm font-bold text-forest-dark break-words">
                      BSZ-{new Date(trace.donation.timestamp).getFullYear()}-{String(trace.donation.id).padStart(5, '0')}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Muzakki</span>
                    <span className="text-sm font-bold text-forest-dark break-all">
                      {trace.donation.donor_username || user?.username || 'Hamba Allah'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Program</span>
                    <span className="text-sm font-semibold text-forest-dark break-words">
                      {trace.donation.campaign_title || 'Zakat Umum'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Nominal Disetor</span>
                    <span className="text-base font-extrabold text-primary tabular-nums">
                      {formatIDR(trace.donation.amount)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Tanggal Transaksi</span>
                    <span className="text-xs font-mono text-forest-dark">{formatDateTime(trace.donation.timestamp)}</span>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Referensi QRIS</span>
                    <span className="text-xs font-mono text-forest-dark break-all">
                      {trace.donation.payment_reference || `DON-${trace.donation.id}`}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Status Pembayaran</span>
                    <Badge tone="success">Lunas Terkonfirmasi</Badge>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-forest-dark">
                    Sebaran Alokasi Dana ke Wilayah ({trace.regions.length} Daerah)
                  </h3>
                  <span className="text-xs text-slate-500">
                    Total penyaluran terverifikasi di pool: <strong>{formatIDR(trace.pool_distributed_total)}</strong>
                  </span>
                </div>

                {trace.regions.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600">
                    Dana pada program/pool ini belum memiliki laporan penyaluran berstatus disetujui. Begitu Amil menyalurkan ke daerah dan Auditor menyetujui bukti, porsi tiap daerah akan tampil di sini.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {trace.regions.map((reg) => (
                      <div key={reg.region} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                          <span className="font-bold text-forest-dark">{reg.region}</span>
                          <div className="flex items-center gap-3 tabular-nums">
                            <Badge tone="primary">{reg.share_percent}%</Badge>
                            <span className="font-bold text-forest-dark">
                              Est. {formatIDR(reg.estimated_allocation_idr)}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(100, Math.max(2, reg.share_percent))}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          {reg.tx_count} catatan penyaluran di wilayah ini · Total tersalurkan {formatIDR(reg.total_distributed)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {trace.reports.length > 0 && activePanel.mode === 'trace' && (
                <div className="space-y-2">
                  <h3 className="text-xs uppercase tracking-wider font-bold text-slate-600">
                    Laporan Penyaluran Terverifikasi Terkait (Non-PII)
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {trace.reports.slice(0, 6).map((rep) => (
                      <Link
                        key={rep.id}
                        to={rep.audit_hash ? `/verify?hash=${rep.audit_hash}` : `/verify?id=${rep.id}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-cream/60 px-3 py-2.5 text-xs hover:bg-mint/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-forest-dark truncate">
                            #{rep.id} · {rep.region}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500 truncate">
                            {rep.audit_hash ? shortHash(rep.audit_hash, 10, 6) : rep.category}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-primary font-semibold shrink-0">
                          Verifikasi <ExternalLink size={12} />
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <p className="rounded-xl bg-mint/50 border border-primary/20 p-3 text-[11px] text-forest">
                {trace.disclaimer}
              </p>
            </div>
          )}
        </Card>
      )}

      <Card className="no-print p-0 sm:p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-forest-dark">Daftar Kuitansi Pembayaran</h2>
          <select
            aria-label="Filter status pembayaran"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-xs leading-5 font-semibold text-forest-dark cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
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
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3.5 py-3 font-semibold">ID & Waktu</th>
                  <th className="px-3.5 py-3 font-semibold">Program</th>
                  <th className="px-3.5 py-3 font-semibold">Referensi</th>
                  <th className="px-3.5 py-3 font-semibold text-right">Nominal</th>
                  <th className="px-3.5 py-3 font-semibold">Status</th>
                  <th className="px-3.5 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((d) => {
                  const st = STATUS_BADGE[d.status] ?? { tone: 'warning', label: d.status };
                  const ref = d.payment_reference ?? `DON-${d.id}`;
                  return (
                    <tr key={d.id} className="hover:bg-cream/60">
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="font-bold text-forest-dark">#{d.id}</span>
                        <p className="text-[11px] text-slate-500">{formatDateTime(d.timestamp)}</p>
                      </td>
                      <td className="px-3.5 py-3">
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
                      <td className="px-3.5 py-3 font-mono text-xs text-slate-600 max-w-[170px]">
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
                      <td className="px-3.5 py-3 text-right font-bold text-forest-dark tabular-nums whitespace-nowrap">
                        {formatIDR(Number(d.amount))}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap space-x-1.5">
                        {d.status === 'CONFIRMED' ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setActivePanel({ donationId: d.id, mode: 'trace' })}
                            >
                              <MapPin size={12} /> Jejak Wilayah
                            </Button>
                            <Button
                              size="sm"
                              variant="gold"
                              onClick={() => setActivePanel({ donationId: d.id, mode: 'bsz' })}
                            >
                              <Receipt size={12} /> BSZ
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {d.status === 'PENDING' ? 'Menunggu bayar' : 'Tidak tersedia'}
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
    </div>
  );
};

export default MyDonationsPage;
