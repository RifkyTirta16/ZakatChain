import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, QrCode, Clock, Info, ArrowRight } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatIDR, formatDateTime } from '../../utils/format';
import { Badge, Button, Card, Input, Select, JourneyTracker } from '../../components/ui';
import { ON_CHAIN_NOTE } from '../../components/ui/badgeStatus';
import type { Campaign } from './useDonation';

interface DonationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialCampaignId?: number | null;
}

const QUICK_AMOUNTS = [50000, 100000, 250000];
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

  const createSession = useMutation<any, Error, { amount: number; donor_name?: string; campaign_id?: number; program_id?: string }>({
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
    refetchInterval: (data) => {
      const status = (data as { status?: string } | undefined)?.status;
      if (status === 'PAID' || status === 'FAILED' || status === 'EXPIRED') return false;
      if (pollExpired) return false;
      return POLL_INTERVAL_MS;
    },
  });

  const token = localStorage.getItem('zakat_token');
  const userRaw = localStorage.getItem('zakat_user');
  const user = userRaw ? JSON.parse(userRaw) : null;
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
      setError('Pilih kampanye terlebih dahulu.');
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
    if (!isLoggedIn) {
      if (effectiveSelectedCampaign) {
        sessionStorage.setItem('zakat_donation_campaign', String(effectiveSelectedCampaign.id));
      }
      sessionStorage.setItem('zakat_donation_amount', String(numericAmount));
      onClose();
      return;
    }
    if (!effectiveSelectedCampaign) {
      setError('Pilih kampanye terlebih dahulu.');
      return;
    }
    if (!isAmountValid()) {
      setError(`Nominal harus antara Rp 1 dan ${formatIDR(MAX_AMOUNT)}.`);
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

  const handleCloseDrawer = () => {
    onClose();
  };

  const handleCheckNow = () => {
    void statusQuery.refetch();
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
      const timer = setTimeout(() => {
        setPollExpired(true);
      }, MAX_POLL_MINUTES * 60 * 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step, pollExpired]);

  useEffect(() => {
    const status = (statusQuery.data as { status?: string } | undefined)?.status;
    if (status === 'PAID' && !paidHandledRef.current) {
      paidHandledRef.current = true;
      setStep('selesai');
      queryClient.invalidateQueries({ queryKey: ['donor-donations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    }
  }, [statusQuery.data, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      handleCloseDrawer();
    }
  };

  const currentStatus = (statusQuery.data as { status?: string } | undefined)?.status;

  const trackerStep = step === 'pembayaran'
    ? (currentStatus === 'PAID' ? 3 : currentStatus === 'FAILED' || currentStatus === 'EXPIRED' ? 1 : 2)
    : step === 'selesai'
    ? 4
    : step === 'ringkasan'
    ? 2
    : 1;

  const trackerRejected = step === 'pembayaran' && (currentStatus === 'FAILED' || currentStatus === 'EXPIRED');

  if (!isOpen) return null;

  return (
    <div
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="donation-drawer-title"
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-end justify-end"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseDrawer} />
      <div className="relative w-full max-w-md h-full bg-white border-l border-primary-light shadow-card transform transition-transform duration-300 translate-y-0">
        <div className="p-4 flex justify-between items-start">
          <h2 id="donation-drawer-title" className="font-extrabold text-primary-dark text-lg">Donasi</h2>
          <button
            onClick={handleCloseDrawer}
            aria-label="Tutup"
            className="rounded-lg p-2 text-primary-dark/70 hover:bg-primary-bg outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step 1: Pilih kampanye dan nominal */}
        {step === 'pilih' && (
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-primary-dark">Kampanye</label>
              <Select
                value={effectiveSelectedCampaign?.id?.toString() ?? ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const c = campaigns?.find((x) => x.id === id);
                  if (c) setUserSelectedCampaign(c);
                }}
                placeholder="Pilih kampanye"
                disabled={campaignsLoading}
                options={(campaigns ?? []).map((c) => ({
                  value: String(c.id),
                  label: `${c.title} (${formatIDR(c.current_amount)} / ${formatIDR(c.target_amount)})`,
                }))}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-primary-dark">Nominal</label>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map((v) => (
                  <button
                    key={v}
                    onClick={() => handleQuickAmount(v)}
                    className={`min-h-[44px] rounded-xl border-2 px-3 py-2 text-sm font-bold text-primary-dark transition-colors ${quickAmount === v ? 'bg-primary-bg border-primary' : 'bg-cream border-transparent hover:border-primary-dark/30'}`}
                  >
                    {formatIDR(v)}
                  </button>
                ))}
                <button
                  onClick={() => { setQuickAmount(null); setError(''); }}
                  className={`min-h-[44px] rounded-xl border-2 px-3 py-2 text-sm font-bold text-primary-dark transition-colors ${quickAmount === null && amount ? 'bg-primary-bg border-primary' : 'bg-cream border-transparent hover:border-primary-dark/30'}`}
                >
                  Lainnya
                </button>
              </div>
              {quickAmount === null && (
                <Input
                  type="number"
                  placeholder="Masukkan nominal"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="mt-2"
                />
              )}
              {quickAmount !== null && (
                <p className="text-sm font-bold text-primary-dark">{formatIDR(quickAmount)}</p>
              )}
            </div>

            {error && (
              <p role="alert" className="text-sm text-coral-dark bg-coral/5 rounded-xl p-3 border border-coral/30">{error}</p>
            )}

            <Button
              className="w-full"
              disabled={createSession.isPending || !isAmountValid() || !effectiveSelectedCampaign || !isLoggedIn}
              onClick={handleToSummary}
            >
              {createSession.isPending ? 'Memproses...' : isLoggedIn ? 'Lanjut ke ringkasan' : 'Masuk untuk berdonasi'}
            </Button>
          </div>
        )}

        {/* Step 2: Ringkasan */}
        {step === 'ringkasan' && effectiveSelectedCampaign && (
          <div className="p-4 space-y-4">
            <Card variant="highlight" className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm font-medium text-primary-dark">{effectiveSelectedCampaign.title}</p>
                  <p className="text-xs text-primary-dark/70">Kampanye yang dipilih</p>
                </div>
                <Badge tone="primary">Aktif</Badge>
              </div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-primary-dark/70 text-sm">Nominal donasi</span>
                <span className="text-2xl font-extrabold text-primary-dark">{formatIDR(numericAmount)}</span>
              </div>
            </Card>

            <div className="bg-cream rounded-xl p-4 space-y-2">
              <p className="text-sm text-primary-dark/70 font-medium">Catatan jujur</p>
              <p className="text-sm text-primary-dark">
                Donasi tercatat setelah pembayaran terkonfirmasi.
              </p>
              <p className="text-xs text-primary-dark/70">{ON_CHAIN_NOTE}</p>
            </div>

            {error && (
              <p role="alert" className="text-sm text-coral-dark bg-coral/5 rounded-xl p-3 border border-coral/30">{error}</p>
            )}

            <Button className="w-full" onClick={handlePay}>
              {createSession.isPending ? 'Memproses...' : 'Lanjut bayar'}
              <ArrowRight size={16} className="ml-2" />
            </Button>
            <button
              onClick={() => setStep('pilih')}
              className="w-full min-h-[44px] rounded-xl border-2 border-transparent bg-transparent text-sm font-bold text-primary-dark/70 hover:bg-primary-bg"
            >
              Kembali ke pilihan nominal
            </button>
          </div>
        )}

        {/* Step 3: Pemantauan pembayaran */}
        {step === 'pembayaran' && paymentData && (
          <div className="p-4 space-y-4">
            <JourneyTracker currentStep={trackerStep} rejected={trackerRejected} size="md" />

            <div className="text-center">
              <div className="flex justify-center items-center gap-2 text-primary mb-4">
                <QrCode size={24} />
                <span className="font-bold text-sm text-primary-dark">Pembayaran QRIS</span>
              </div>
              <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-card">
                <div className="w-52 h-52 bg-cream rounded-lg flex items-center justify-center text-primary-dark/70 font-bold text-center p-4 text-xs break-all">
                  {paymentData.paymentData.qris_url}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-2xl font-extrabold text-primary-dark">{formatIDR(paymentData.paymentData.amount)}</p>
              <div className="flex items-center justify-center gap-2 text-xs text-primary-dark/70">
                <Clock size={12} />
                <span>Berlaku hingga: {formatDateTime(paymentData.paymentData.expires_at)}</span>
              </div>
            </div>

            <div className="p-5 bg-cream rounded-xl text-sm text-left space-y-3">
              <p className="font-bold flex items-center gap-2 text-primary-dark text-sm">
                <Info size={14} /> Instruksi Pembayaran
              </p>
              <ul className="space-y-2 text-primary-dark/70 list-decimal list-inside">
                <li>Pindai kode QRIS menggunakan aplikasi pembayaran (GOPAY, OVO, Dana, dll)</li>
                <li>Pastikan nominal sesuai dengan yang tertera</li>
                <li>Sistem akan memverifikasi pembayaran secara otomatis</li>
              </ul>
            </div>

            {pollExpired ? (
              <div className="bg-coral/5 rounded-xl p-4 border border-coral/30">
                <Badge tone="coral">Sesi pembayaran kedaluwarsa</Badge>
                <p className="text-sm text-primary-dark/70 mt-3">Sesi pembayaran telah melebihi batas waktu 5 menit.</p>
                <button
                  onClick={handlePayAgain}
                  className="w-full min-h-[44px] mt-3 rounded-xl border-2 border-coral bg-transparent text-sm font-bold text-coral-dark hover:bg-coral/10"
                >
                  Buat sesi baru
                </button>
              </div>
            ) : currentStatus === 'FAILED' || currentStatus === 'EXPIRED' ? (
              <div className="bg-coral/5 rounded-xl p-4 border border-coral/30">
                <Badge tone="coral">{currentStatus === 'FAILED' ? 'Pembayaran gagal' : 'Sesi kedaluwarsa'}</Badge>
                <p className="text-sm text-primary-dark/70 mt-3">
                  {currentStatus === 'FAILED' ? 'Pembayaran gagal diproses.' : 'Sesi pembayaran telah kedaluwarsa.'}
                </p>
                <button
                  onClick={handlePayAgain}
                  className="w-full min-h-[44px] mt-3 rounded-xl border-2 border-coral bg-transparent text-sm font-bold text-coral-dark hover:bg-coral/10"
                >
                  Buat sesi baru
                </button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-xs text-primary-dark/70 flex items-center justify-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse" />
                    Menunggu konfirmasi pembayaran...
                  </p>
                </div>

                <button
                  onClick={handleCheckNow}
                  className="w-full min-h-[44px] rounded-xl border-2 border-primary bg-transparent text-sm font-bold text-primary-dark hover:bg-primary-bg"
                >
                  Periksa sekarang
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 4: Selesai */}
        {step === 'selesai' && (
          <div className="p-4 text-center space-y-4">
            <div className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="text-success" size={48} />
            </div>
            <h3 className="font-extrabold text-primary-dark text-lg">Pembayaran Berhasil</h3>
            <p className="text-sm text-primary-dark/70">
              Pembayaran terkonfirmasi. Tercatat dalam sistem.
            </p>
            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={handlePayAgain}>
                Donasi lagi
              </Button>
              <button
                onClick={handleCloseDrawer}
                className="w-full min-h-[44px] rounded-xl border-2 border-transparent bg-transparent text-sm font-bold text-primary-dark/70 hover:bg-primary-bg"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationDrawer;
