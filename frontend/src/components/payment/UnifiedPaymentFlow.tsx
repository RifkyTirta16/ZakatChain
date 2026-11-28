import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import apiClient from '../../utils/api';
import { formatIDR } from '../../utils/format';
import { Badge, Button, Input, JourneyTracker, QrCodeBox, Select, Skeleton } from '../ui';
import { invalidateDonationQueries, useCampaigns } from '../dashboard/hooks/useDashboardData';
import { PaymentSuccessCard } from './PaymentSuccessCard';

export interface UnifiedPaymentFlowProps {
  initialAmount?: string;
  initialZakatType?: string;
  initialCampaignId?: string;
  lockCampaign?: boolean;
  resumeSessionId?: string | null;
  compact?: boolean;
  onSuccess?: () => void;
}

interface PaymentSessionPayload {
  session_id: string;
  qris_url: string;
  lan_qris_url?: string;
  doku_checkout_url?: string;
  amount: number;
  expires_at: string;
  provider?: string;
}

interface PaymentStatusResponse {
  session_id: string;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED';
  amount: number;
  program_id?: string | null;
  expires_at?: string | null;
  qris_url?: string;
  lan_qris_url?: string;
  doku_checkout_url?: string;
  provider?: string;
}

const PRESET_AMOUNTS = [50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000];

const ZAKAT_TYPES = [
  { value: 'zakat-penghasilan', label: 'Zakat Penghasilan (Profesi)' },
  { value: 'zakat-maal', label: 'Zakat Maal (Harta & Tabungan)' },
  { value: 'zakat-emas', label: 'Zakat Emas' },
  { value: 'zakat-fitrah', label: 'Zakat Fitrah' },
  { value: 'infaq-sedekah', label: 'Infaq & Sedekah' },
];

const formatCountdown = (expiresAt: string | null | undefined, nowMs: number): string | null => {
  if (!expiresAt) return null;
  const diffSec = Math.max(0, Math.floor((Date.parse(expiresAt) - nowMs) / 1000));
  if (Number.isNaN(diffSec)) return null;
  const mins = String(Math.floor(diffSec / 60)).padStart(2, '0');
  const secs = String(diffSec % 60).padStart(2, '0');
  return `${mins}:${secs}`;
};

export const UnifiedPaymentFlow = ({
  initialAmount = '',
  initialZakatType = 'zakat-penghasilan',
  initialCampaignId = 'GENERAL',
  lockCampaign = false,
  resumeSessionId = null,
  compact = false,
  onSuccess,
}: UnifiedPaymentFlowProps) => {
  const queryClient = useQueryClient();
  const normalizedResume = resumeSessionId || null;
  const [stepState, setStepState] = useState<{ resumeKey: string | null; step: 'form' | 'payment' | 'success' } | null>(
    null
  );
  const [sessionState, setSessionState] = useState<{
    resumeKey: string | null;
    session: PaymentSessionPayload | null;
    sessionId: string | null;
  } | null>(null);
  const [draftAmount, setDraftAmount] = useState<{ base: string; value: string } | null>(null);
  const [zakatType, setZakatType] = useState(
    ZAKAT_TYPES.some((t) => t.value === initialZakatType) ? initialZakatType : 'zakat-penghasilan'
  );
  const [campaignId, setCampaignId] = useState(initialCampaignId || 'GENERAL');
  const [donorName, setDonorName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedSession, setCopiedSession] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const step = stepState?.resumeKey === normalizedResume ? stepState.step : normalizedResume ? 'payment' : 'form';
  const activeSessionId = sessionState?.resumeKey === normalizedResume ? sessionState.sessionId : normalizedResume;
  const session = sessionState?.resumeKey === normalizedResume ? sessionState.session : null;
  const amount = draftAmount?.base === initialAmount ? draftAmount.value : initialAmount;
  const setAmount = (val: string) => setDraftAmount({ base: initialAmount, value: val });

  const campaignsQuery = useCampaigns();
  const activeCampaigns = (campaignsQuery.data ?? []).filter((c) => c.status === 'ACTIVE');

  const statusQuery = useQuery<PaymentStatusResponse>({
    queryKey: ['payment-status', activeSessionId],
    enabled: step === 'payment' && Boolean(activeSessionId),
    queryFn: async () => {
      const { data } = await apiClient.get<PaymentStatusResponse>(`/payments/status/${activeSessionId}`);
      return data;
    },
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'PAID' || s === 'FAILED' || s === 'EXPIRED' ? false : 3000;
    },
  });

  useEffect(() => {
    if (step !== 'payment') return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [step]);

  const effectiveStatus = statusQuery.data?.status ?? 'PENDING';
  const effectiveStep = step === 'payment' && effectiveStatus === 'PAID' ? 'success' : step;

  useEffect(() => {
    if (effectiveStatus === 'PAID' && activeSessionId) {
      invalidateDonationQueries(queryClient, {
        settled: true,
        ...(campaignId !== 'GENERAL' ? { campaignId } : {}),
      });
      onSuccess?.();
    }
  }, [effectiveStatus, activeSessionId, queryClient, campaignId, onSuccess]);

  const createSessionMutation = useMutation({
    mutationFn: async (overrideAmount?: number) => {
      const numericAmount = overrideAmount ?? Number(amount);
      const payload: Record<string, unknown> = {
        amount: numericAmount,
        program_id: zakatType,
      };
      if (donorName.trim()) payload.donor_name = donorName.trim();
      if (campaignId && campaignId !== 'GENERAL') {
        payload.campaign_id = Number(campaignId);
      }
      const { data } = await apiClient.post<{
        paymentData?: PaymentSessionPayload;
      } & PaymentSessionPayload>('/payments/session', payload);
      return data.paymentData ?? data;
    },
    onSuccess: (payload) => {
      setSessionState({ resumeKey: normalizedResume, session: payload, sessionId: payload.session_id });
      setAmount(String(payload.amount));
      setStepState({ resumeKey: normalizedResume, step: 'payment' });
      setError(null);
      invalidateDonationQueries(queryClient);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Gagal membuat sesi pembayaran QRIS.');
    },
  });

  const sandboxConfirmMutation = useMutation({
    mutationFn: async (sid: string) => {
      await apiClient.post(`/payments/sandbox/confirm/${encodeURIComponent(sid)}`);
    },
    onSuccess: () => {
      void statusQuery.refetch();
      invalidateDonationQueries(queryClient, {
        settled: true,
        ...(campaignId !== 'GENERAL' ? { campaignId } : {}),
      });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Gagal mengonfirmasi pembayaran sandbox.');
    },
  });

  const resolvedQrisUrl = session?.qris_url || statusQuery.data?.qris_url || '';
  const resolvedLanUrl = session?.lan_qris_url || statusQuery.data?.lan_qris_url;
  const resolvedExpires = session?.expires_at || statusQuery.data?.expires_at || null;
  const resolvedAmount = statusQuery.data?.amount ?? session?.amount ?? (Number(amount) || 0);
  const countdown = formatCountdown(resolvedExpires, nowMs);
  const isTerminalFail = effectiveStatus === 'EXPIRED' || effectiveStatus === 'FAILED';

  const selectedCampaign = activeCampaigns.find((c) => String(c.id) === campaignId);
  const trackerIndex = effectiveStep === 'form' ? 0 : effectiveStep === 'payment' ? 1 : 2;

  const handleReset = () => {
    setStepState({ resumeKey: normalizedResume, step: 'form' });
    setSessionState({ resumeKey: normalizedResume, session: null, sessionId: null });
    setError(null);
  };

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedSession(true);
    window.setTimeout(() => setCopiedSession(false), 1800);
  };

  return (
    <div className="space-y-4">
      <JourneyTracker
        currentStep={trackerIndex}
        rejected={effectiveStep === 'payment' && isTerminalFail}
        steps={['Niat & Nominal', 'Bayar QRIS', 'Kuitansi & BSZ']}
      />

      {effectiveStep === 'form' && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            createSessionMutation.mutate(undefined);
          }}
          className="space-y-4"
        >
          <Select
            label="Jenis Zakat / Infaq"
            value={zakatType}
            onChange={(e) => setZakatType(e.target.value)}
            options={ZAKAT_TYPES}
          />

          {!lockCampaign && (
            <Select
              label="Salurkan Ke"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              options={[
                { value: 'GENERAL', label: 'Zakat Umum (Prioritas Kemiskinan Tertinggi)' },
                ...activeCampaigns.map((c) => ({ value: String(c.id), label: c.title })),
              ]}
            />
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slateText">
              Nominal Zakat (Rupiah)
            </label>
            <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-2`}>
              {PRESET_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String(val))}
                  className={`min-h-[40px] rounded-[10px] border text-xs font-semibold transition-colors tabular-nums ${
                    amount === String(val)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-cream border-slate-200 text-forest-dark hover:bg-mint'
                  }`}
                >
                  {formatIDR(val)}
                </button>
              ))}
            </div>
            <Input
              type="number"
              min="1000"
              step="1000"
              placeholder="Atau ketik nominal Rupiah (min. Rp 1.000)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {!compact && (
            <Input
              label="Nama Tercatat di BSZ (Opsional)"
              placeholder="Kosongkan untuk tercatat sebagai Hamba Allah"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
            />
          )}

          <div className="rounded-xl bg-mint/55 border border-primary/20 px-3.5 py-2.5 text-[11px] text-forest flex items-start gap-2">
            <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
            <span>
              Minimal <strong>87,5%</strong> disalurkan ke mustahik terverifikasi · Maks.{' '}
              <strong>12,5%</strong> hak amil · Pembayaran QRIS Rupiah resmi.
            </span>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-medium">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="gold"
            size="lg"
            loading={createSessionMutation.isPending}
            disabled={!amount || Number(amount) < 1000}
            className="w-full"
          >
            <QrCode size={16} /> Lanjut ke QRIS ({amount && Number(amount) >= 1000 ? formatIDR(Number(amount)) : 'Isi Nominal'})
          </Button>
        </form>
      )}

      {effectiveStep === 'payment' && (
        <div className="space-y-4">
          {!resolvedQrisUrl && statusQuery.isPending ? (
            <Skeleton lines={8} />
          ) : isTerminalFail ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3 text-left">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-950">
                    {effectiveStatus === 'EXPIRED' ? 'Sesi QRIS Telah Kedaluwarsa' : 'Pembayaran Belum Berhasil'}
                  </p>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Jangan khawatir — bila Anda belum menyelesaikan transfer di aplikasi QRIS, tidak ada dana yang terpotong. Buat kode QRIS baru dengan nominal yang sama hanya dalam satu klik.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="gold"
                  loading={createSessionMutation.isPending}
                  onClick={() => createSessionMutation.mutate(resolvedAmount || 50_000)}
                  className="flex-1"
                >
                  <RefreshCw size={14} /> Buat QRIS Baru ({formatIDR(resolvedAmount)})
                </Button>
                <Button type="button" variant="secondary" onClick={handleReset}>
                  Ubah Nominal
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream border border-slate-200 px-4 py-3 text-left">
                <div>
                  <p className="text-[11px] text-slate-500 uppercase font-semibold">Total Pembayaran</p>
                  <p className="font-display text-lg font-extrabold text-forest-dark tabular-nums">
                    {formatIDR(resolvedAmount)}
                  </p>
                </div>
                {countdown && (
                  <Badge tone="warning">
                    <Clock size={12} /> Berlaku {countdown}
                  </Badge>
                )}
              </div>

              {resolvedQrisUrl && (
                <QrCodeBox value={resolvedQrisUrl} lanValue={resolvedLanUrl} size={compact ? 168 : 192} />
              )}

              {activeSessionId && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 flex items-center justify-between gap-2 text-left">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                      Referensi Sesi QRIS
                    </p>
                    <p className="font-mono text-xs font-bold text-forest-dark truncate">{activeSessionId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeSessionId)}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-white inline-flex items-center gap-1 text-xs font-semibold shrink-0"
                  >
                    {copiedSession ? (
                      <span className="text-primary inline-flex items-center gap-1">
                        <Check size={13} /> Tersalin
                      </span>
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-medium text-left">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  loading={statusQuery.isFetching}
                  onClick={() => void statusQuery.refetch()}
                  className="w-full"
                >
                  <RefreshCw size={14} /> Cek Status Pembayaran
                </Button>
                {import.meta.env.DEV && activeSessionId && (
                  <Button
                    type="button"
                    variant="gold"
                    loading={sandboxConfirmMutation.isPending}
                    onClick={() => sandboxConfirmMutation.mutate(activeSessionId)}
                    className="w-full"
                  >
                    <CheckCircle2 size={14} /> Simulasikan Bayar (Sandbox)
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={handleReset} className="w-full">
                  <CreditCard size={14} /> Ubah Nominal / Program
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {effectiveStep === 'success' && activeSessionId && (
        <PaymentSuccessCard
          amount={resolvedAmount}
          sessionId={activeSessionId}
          campaignLabel={selectedCampaign?.title}
          onReset={handleReset}
        />
      )}
    </div>
  );
};
