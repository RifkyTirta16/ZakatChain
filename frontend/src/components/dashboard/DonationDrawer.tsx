import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Clock, Info, QrCode, X } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime, formatIDR } from '../../utils/format';
import { Badge, Button, Card, Input, JourneyTracker, ON_CHAIN_NOTE, Select } from '../../components/ui';
import type { Campaign } from './useDonation';

interface DonationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialCampaignId?: number | null;
}

const QUICK_AMOUNTS = [50_000, 100_000, 250_000];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 1_000_000_000_000;
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MINUTES = 5;

const DonationDrawer = ({ isOpen, onClose, initialCampaignId }: DonationDrawerProps) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const paidHandledRef = useRef(false);

  const queryClient = useQueryClient();

  const [step, setStep] = useState<'pilih' | 'ringkasan' | 'pembayaran' | 'selesai'>('pilih');
  const [userSelectedCampaign, setUserSelectedCampaign] = useState<Campaign | null>(null);
  const [amount, setAmount] = useState('');
  const [quickAmount, setQuickAmount] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [pollExpired, setPollExpired] = useState(false);

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data } = await apiClient.get<Campaign[]>('/campaigns');
      return data;
    },
  });

  const effectiveSelectedCampaign = useMemo<Campaign | null>(() => {
    if (userSelectedCampaign) return userSelectedCampaign;
    if (initialCampaignId && campaigns) {
      return campaigns.find((x) => x.id === initialCampaignId) ?? null;
    }
    return null;
  }, [userSelectedCampaign, initialCampaignId, campaigns]);

  const createSession = useMutation<
    any,
    Error,
    { amount: number; donor_name?: string; campaign_id?: number; program_id?: string }
  >({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post('/payments/session', payload);
      return data;
    },
    onSuccess: (data) => {
      paidHandledRef.current = false;
      setPaymentData(data);
      setStep('pembayaran');
    },
    onError: () => {
      setError('Gagal membuat sesi pembayaran. Silakan coba lagi.');
    },
  });

  const sessionId = paymentData?.paymentData.session_id ?? null;

  const statusQuery = useQuery({
    queryKey: ['payment-status', sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/payments/status/${sessionId}`);
      return data;
    },
    enabled: Boolean(sessionId) && step === 'pembayaran' && !pollExpired,
    refetchInterval: (query) => {
      const status = (query.state.data as { status?: string } | undefined)?.status;
      if (status === 'PAID' || status === 'FAILED' || status === 'EXPIRED') return false;
      if (pollExpired) return false;
      return POLL_INTERVAL_MS;
    },
  });

  const token = localStorage.getItem('zakat_token');
  let user: { username?: string } | null = null;
  try {
    const raw = localStorage.getItem('zakat_user');
    user = raw ? (JSON.parse(raw) as { username?: string }) : null;
  } catch {
    user = null;
  }
  const isLoggedIn = Boolean(token);

  const numericAmount = quickAmount ?? (amount ? Number(amount) : 0);

  const isAmountValid = () => {
    const n = numericAmount;
    return n >= MIN_AMOUNT && n <= MAX_AMOUNT && Number.isFinite(n);
  };

  const handleQuickAmount = (value: number) => {
    setQuickAmount(value);
    setAmount('');
    setError('');
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    setQuickAmount(null);
    setError('');
  };

  const handleToSummary = () => {
    setError('');
    if (!effectiveSelectedCampaign) {
      setError('Pilih program zakat terlebih dahulu.');
      return;
    }
    if (!isAmountValid()) {
      setError(`Nominal harus antara Rp 1 dan ${formatIDR(MAX_AMOUNT)}.`);
      return;
    }
    setStep('ringkasan');
  };

  const handlePay = () => {
    setError('');
    if (!isLoggedIn || !effectiveSelectedCampaign || !isAmountValid()) {
      setError('Pastikan Anda sudah masuk dan nominal valid.');
      return;
    }
    createSession.mutate({
      amount: numericAmount,
      donor_name: user?.username ?? undefined,
      campaign_id: effectiveSelectedCampaign.id,
      program_id: 'zakat',
    });
  };

  const handlePayAgain = () => {
    setStep('pilih');
    setPaymentData(null);
    setError('');
    setPollExpired(false);
    paidHandledRef.current = false;
    setUserSelectedCampaign(null);
    setAmount('');
    setQuickAmount(null);
  };

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      const firstFocusable = drawerRef.current?.querySelector<HTMLElement>('button, [href], input, select');
      firstFocusable?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'pembayaran' && !pollExpired) {
      const timer = setTimeout(() => setPollExpired(true), MAX_POLL_MINUTES * 60 * 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step, pollExpired]);

  useEffect(() => {
    const status = (statusQuery.data as { status?: string } | undefined)?.status;
    if (status === 'PAID' && !paidHandledRef.current) {
      paidHandledRef.current = true;
      setStep('selesai');
      void queryClient.invalidateQueries({ queryKey: ['donor-donations'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['donations'] });
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    }
  }, [statusQuery.data, queryClient]);

  if (!isOpen) return null;

  const currentStatus = (statusQuery.data as { status?: string } | undefined)?.status;
  const trackerStep =
    step === 'pembayaran'
      ? currentStatus === 'PAID'
        ? 3
        : currentStatus === 'FAILED' || currentStatus === 'EXPIRED'
          ? 1
          : 2
      : step === 'selesai'
        ? 4
        : step === 'ringkasan'
          ? 2
          : 1;
  const trackerRejected = step === 'pembayaran' && (currentStatus === 'FAILED' || currentStatus === 'EXPIRED');

  return (
    <div
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="donation-drawer-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className="fixed inset-0 z-50 flex justify-end"
    >
      <div className="absolute inset-0 bg-forest-dark/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white border-l border-slate-200 shadow-2xl overflow-y-auto">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 id="donation-drawer-title" className="font-bold text-forest-dark text-lg">
              Salurkan Zakat
            </h2>
            <p className="text-xs text-slate-500">Pembayaran Rupiah (IDR) terpantau</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel donasi"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        {step === 'pilih' && (
          <div className="p-5 space-y-5">
            <Select
              label="Program Penyaluran"
              value={effectiveSelectedCampaign?.id?.toString() ?? ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                const c = campaigns?.find((x) => x.id === id);
                if (c) setUserSelectedCampaign(c);
              }}
              placeholder="Pilih program zakat"
              disabled={campaignsLoading}
              options={(campaigns ?? []).map((c) => ({
                value: String(c.id),
                label: `${c.title} (${formatIDR(c.current_amount)} / ${formatIDR(c.target_amount)})`,
              }))}
            />

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slateText">
                Nominal Zakat (IDR)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_AMOUNTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleQuickAmount(v)}
                    className={`min-h-[42px] rounded-[10px] border px-3 py-2 text-xs font-semibold transition-colors tabular-nums ${
                      quickAmount === v
                        ? 'bg-primary text-white border-primary'
                        : 'bg-cream border-slate-200 text-forest-dark hover:bg-mint'
                    }`}
                  >
                    {formatIDR(v)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setQuickAmount(null);
                    setError('');
                  }}
                  className={`min-h-[42px] rounded-[10px] border px-3 py-2 text-xs font-semibold transition-colors ${
                    quickAmount === null && amount
                      ? 'bg-primary text-white border-primary'
                      : 'bg-cream border-slate-200 text-forest-dark hover:bg-mint'
                  }`}
                >
                  Nominal Lain
                </button>
              </div>
              {quickAmount === null && (
                <Input
                  type="number"
                  placeholder="Masukkan nominal Rupiah"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
              )}
              {quickAmount !== null && (
                <p className="text-sm font-bold text-forest-dark tabular-nums">{formatIDR(quickAmount)}</p>
              )}
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-800 bg-red-50 rounded-xl p-3 border border-red-200">
                {error}
              </p>
            )}

            <Button
              className="w-full"
              disabled={createSession.isPending || !isAmountValid() || !effectiveSelectedCampaign || !isLoggedIn}
              onClick={handleToSummary}
            >
              {createSession.isPending ? 'Memproses…' : isLoggedIn ? 'Lanjut ke Ringkasan' : 'Masuk untuk Berdonasi'}
            </Button>
          </div>
        )}

        {step === 'ringkasan' && effectiveSelectedCampaign && (
          <div className="p-5 space-y-5">
            <Card variant="highlight" className="p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-sm font-bold text-forest-dark">{effectiveSelectedCampaign.title}</p>
                  <p className="text-xs text-slate-500">Program dipilih</p>
                </div>
                <Badge tone="success">Aktif</Badge>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-600">Nominal Pembayaran</span>
                <span className="text-xl font-extrabold text-forest-dark tabular-nums">{formatIDR(numericAmount)}</span>
              </div>
            </Card>

            <div className="bg-cream rounded-xl p-4 space-y-1.5 border border-slate-200/70">
              <p className="text-xs font-bold text-forest-dark">Informasi Transparansi</p>
              <p className="text-xs text-slate-600">Donasi tercatat di riwayat Anda setelah pembayaran terkonfirmasi.</p>
              <p className="text-[11px] text-slate-500">{ON_CHAIN_NOTE}</p>
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-800 bg-red-50 rounded-xl p-3 border border-red-200">
                {error}
              </p>
            )}

            <Button variant="gold" loading={createSession.isPending} onClick={handlePay} className="w-full">
              Buat Kode Pembayaran QRIS <ArrowRight size={15} />
            </Button>
            <Button variant="ghost" onClick={() => setStep('pilih')} className="w-full">
              Kembali ke Pilihan Nominal
            </Button>
          </div>
        )}

        {step === 'pembayaran' && paymentData && (
          <div className="p-5 space-y-5">
            <JourneyTracker currentStep={trackerStep} rejected={trackerRejected} size="md" />

            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 text-primary font-bold text-sm">
                <QrCode size={18} /> Pembayaran QRIS Sandbox
              </div>
              <div className="bg-cream p-3 rounded-2xl inline-block border border-slate-200">
                <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center text-forest-dark font-mono text-xs break-all p-3 border border-slate-200">
                  {paymentData.paymentData.qris_url}
                </div>
              </div>
              <p className="text-2xl font-extrabold text-forest-dark tabular-nums">
                {formatIDR(paymentData.paymentData.amount)}
              </p>
              <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                <Clock size={12} /> Berlaku hingga {formatDateTime(paymentData.paymentData.expires_at)}
              </p>
            </div>

            <div className="p-4 bg-cream rounded-xl text-xs text-slate-600 space-y-2 border border-slate-200/70">
              <p className="font-bold flex items-center gap-1.5 text-forest-dark">
                <Info size={14} className="text-primary" /> Instruksi Pembayaran
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Pindai kode QRIS dengan aplikasi e-wallet atau m-banking.</li>
                <li>Pastikan nominal IDR sesuai dengan tagihan.</li>
                <li>Status akan diperbarui otomatis setelah konfirmasi sistem.</li>
              </ol>
            </div>

            {pollExpired || currentStatus === 'FAILED' || currentStatus === 'EXPIRED' ? (
              <div className="bg-red-50 rounded-xl p-4 border border-red-200 space-y-3 text-center">
                <Badge tone="danger">
                  {currentStatus === 'FAILED' ? 'Pembayaran Gagal' : 'Sesi Kedaluwarsa'}
                </Badge>
                <p className="text-xs text-slate-700">
                  Sesi pembayaran berakhir atau tidak berhasil diproses. Silakan buat sesi baru.
                </p>
                <Button variant="danger" onClick={handlePayAgain} className="w-full">
                  Buat Sesi Baru
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 flex items-center justify-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse" />
                  Menunggu konfirmasi pembayaran…
                </p>
                <Button variant="secondary" onClick={() => void statusQuery.refetch()} className="w-full">
                  Periksa Status Sekarang
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'selesai' && (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-mint text-primary rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="font-bold text-forest-dark text-lg">Pembayaran Terkonfirmasi</h3>
            <p className="text-sm text-slate-600">
              Jazakumullahu khairan. Transaksi zakat Anda telah tercatat dalam sistem.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button variant="primary" onClick={handlePayAgain} className="w-full">
                Salurkan Zakat Lagi
              </Button>
              <Button variant="ghost" onClick={onClose} className="w-full">
                Tutup
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationDrawer;
