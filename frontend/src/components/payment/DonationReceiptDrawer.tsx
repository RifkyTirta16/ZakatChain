import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ExternalLink, MapPin, Printer, Receipt } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime, formatIDR, parseUtcDate, shortHash } from '../../utils/format';
import { Badge, Button, ErrorState, ON_CHAIN_NOTE, Skeleton, SlideOverDrawer } from '../ui';

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

interface DonationReceiptDrawerProps {
  donationId: number | null;
  initialMode: 'bsz' | 'trace';
  username?: string | null;
  onClose: () => void;
}

/** Slide-over drawer for Bukti Setor Zakat (BSZ) & proportional multi-region trace. */
export const DonationReceiptDrawer = ({
  donationId,
  initialMode,
  username,
  onClose,
}: DonationReceiptDrawerProps) => {
  const modeKey = `${donationId ?? 'none'}:${initialMode}`;
  const [overrideMode, setOverrideMode] = useState<{ key: string; mode: 'bsz' | 'trace' } | null>(null);
  const [fallbackYear] = useState(() => new Date().getFullYear());
  const mode = overrideMode?.key === modeKey ? overrideMode.mode : initialMode;
  const selectMode = (nextMode: 'bsz' | 'trace') => setOverrideMode({ key: modeKey, mode: nextMode });

  const traceQuery = useQuery<DonationTraceResponse>({
    queryKey: ['donation-trace', donationId],
    enabled: donationId !== null,
    queryFn: async () => {
      const { data } = await apiClient.get<DonationTraceResponse>(`/donations/${donationId}/trace`);
      return data;
    },
  });

  const trace = traceQuery.data;
  const parsedDate = parseUtcDate(trace?.donation.timestamp);
  const year = parsedDate ? parsedDate.getFullYear() : fallbackYear;

  return (
    <SlideOverDrawer
      isOpen={donationId !== null}
      onClose={onClose}
      title={mode === 'bsz' ? `Bukti Setor Zakat (BSZ) #${donationId ?? ''}` : `Jejak Alokasi · Donasi #${donationId ?? ''}`}
      subtitle={
        mode === 'bsz'
          ? 'Tanda terima resmi penyetoran zakat dalam Rupiah (IDR).'
          : 'Sebaran proporsional penyaluran terverifikasi di pool dana yang sama.'
      }
      headerActions={
        mode === 'bsz' && trace ? (
          <Button type="button" size="sm" variant="gold" onClick={() => window.print()}>
            <Printer size={14} /> Cetak PDF
          </Button>
        ) : undefined
      }
    >
      <div className="no-print grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => selectMode('bsz')}
          className={`min-h-[38px] rounded-[9px] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
            mode === 'bsz' ? 'bg-white text-forest-dark shadow-xs' : 'text-slate-600 hover:text-forest-dark'
          }`}
        >
          <Receipt size={14} /> Bukti Setor (BSZ)
        </button>
        <button
          type="button"
          onClick={() => selectMode('trace')}
          className={`min-h-[38px] rounded-[9px] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
            mode === 'trace' ? 'bg-white text-forest-dark shadow-xs' : 'text-slate-600 hover:text-forest-dark'
          }`}
        >
          <MapPin size={14} /> Jejak Wilayah
        </button>
      </div>

      {traceQuery.isPending ? (
        <Skeleton lines={7} />
      ) : traceQuery.isError || !trace ? (
        <ErrorState
          message="Gagal memuat rincian bukti & alokasi donasi."
          retry={() => void traceQuery.refetch()}
        />
      ) : (
        <div className="space-y-5">
          {mode === 'bsz' && (
            <div className="grid sm:grid-cols-2 gap-3.5 rounded-2xl bg-cream p-4 border border-slate-200">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Nomor BSZ
                </span>
                <span className="font-mono text-sm font-bold text-forest-dark">
                  BSZ-{year}-{String(trace.donation.id).padStart(5, '0')}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Muzakki
                </span>
                <span className="text-sm font-bold text-forest-dark">
                  {trace.donation.donor_username || username || 'Hamba Allah'}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Program Penyaluran
                </span>
                <span className="text-sm font-semibold text-forest-dark">
                  {trace.donation.campaign_title || 'Zakat Umum'}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Nominal Disetor
                </span>
                <span className="text-base font-extrabold text-primary tabular-nums">
                  {formatIDR(trace.donation.amount)}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Waktu Terkonfirmasi
                </span>
                <span className="text-xs font-mono text-forest-dark">
                  {formatDateTime(trace.donation.timestamp)}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Status Pembayaran
                </span>
                <Badge tone="success">Lunas Terkonfirmasi</Badge>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Referensi Pembayaran QRIS
                </span>
                <span className="text-xs font-mono text-forest-dark break-all">
                  {trace.donation.payment_reference || `DON-${trace.donation.id}`}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-forest-dark">
                Sebaran Alokasi Wilayah ({trace.regions.length} Daerah)
              </h3>
              <span className="text-xs text-slate-500">
                Pool tersalurkan: <strong className="text-forest-dark">{formatIDR(trace.pool_distributed_total)}</strong>
              </span>
            </div>

            {trace.regions.length === 0 ? (
              <p className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
                Dana pada pool/program ini belum memiliki laporan penyaluran berstatus disetujui. Porsi wilayah akan muncul otomatis setelah Amil mencatat distribusi dan Auditor menyetujui bukti.
              </p>
            ) : (
              <div className="space-y-2.5">
                {trace.regions.map((reg) => (
                  <div key={reg.region} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                      <span className="font-bold text-forest-dark">{reg.region}</span>
                      <div className="flex items-center gap-2 tabular-nums">
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
                      {reg.tx_count} penyaluran di wilayah ini · Total pool {formatIDR(reg.total_distributed)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {trace.reports.length > 0 && mode === 'trace' && (
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-wider font-bold text-slate-600">
                Laporan Penyaluran Terverifikasi (Non-PII)
              </h3>
              <div className="space-y-2">
                {trace.reports.slice(0, 6).map((rep) => (
                  <Link
                    key={rep.id}
                    to={`/verify?query=${encodeURIComponent(rep.audit_hash || String(rep.id))}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-cream/70 px-3.5 py-2.5 text-xs hover:bg-mint/60 transition-colors"
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
                      Cek <ExternalLink size={12} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <p className="rounded-xl bg-mint/50 border border-primary/20 p-3 text-[11px] text-forest leading-relaxed">
            {trace.disclaimer || ON_CHAIN_NOTE}
          </p>
        </div>
      )}
    </SlideOverDrawer>
  );
};
