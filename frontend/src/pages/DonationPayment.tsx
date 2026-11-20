import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Info,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import apiClient from '../utils/api';
import { formatDateTime, formatIDR } from '../utils/format';
import { Badge, Button, Card, Input, JourneyTracker, ON_CHAIN_NOTE, QrCodeBox, Select } from '../components/ui';
import { useCampaigns } from '../components/dashboard/hooks/useDashboardData';

interface PaymentSession {
  status: string;
  paymentData: {
    session_id: string;
    qris_url: string;
    lan_qris_url?: string;
    amount: number;
    expires_at: string;
  };
}

interface PaymentStatus {
  session_id: string;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED';
  amount: number;
}

const PRESET_AMOUNTS = [50_000, 100_000, 250_000, 500_000, 1_000_000];

const ZAKAT_TYPES = [
  { value: 'zakat-penghasilan', label: 'Zakat Penghasilan (Profesi)' },
  { value: 'zakat-maal', label: 'Zakat Maal (Harta & Tabungan)' },
  { value: 'zakat-fitrah', label: 'Zakat Fitrah' },
  { value: 'infaq-sedekah', label: 'Infaq & Sedekah' },
];

const DonationPayment = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const initialAmount = searchParams.get('amount') ?? '';

  const [step, setStep] = useState<'form' | 'review' | 'payment' | 'success'>('form');
  const [zakatType, setZakatType] = useState('zakat-penghasilan');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [amount, setAmount] = useState(initialAmount);
  const [donorName, setDonorName] = useState('');
  const [paymentData, setPaymentData] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedSession, setCopiedSession] = useState(false);

  const campaignsQuery = useCampaigns();
  const activeCampaigns = (campaignsQuery.data ?? []).filter((c) => c.status === 'ACTIVE');

  const statusQuery = useQuery<PaymentStatus>({
    queryKey: ['payment-status', paymentData?.paymentData.session_id],
    queryFn: async () => {
      const { data } = await apiClient.get<PaymentStatus>(
        `/payments/status/${paymentData?.paymentData.session_id}`,
      );
      return data;
    },
    enabled: step === 'payment' && Boolean(paymentData?.paymentData.session_id),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'PAID' || s === 'FAILED' || s === 'EXPIRED' ? false : 4000;
    },
  });

  const effectiveStep =
    step === 'payment' && statusQuery.data?.status === 'PAID' ? 'success' : step;

  const sessionMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        amount: Number(amount),
        program_id: zakatType,
      };
      if (donorName.trim()) payload.donor_name = donorName.trim();
      if (selectedCampaignId) payload.campaign_id = Number(selectedCampaignId);
      const { data } = await apiClient.post<PaymentSession>('/payments/session', payload);
      return data;
    },
    onSuccess: (data) => {
      setPaymentData(data);
      setStep('payment');
      setError(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Gagal membuat sesi pembayaran.');
    },
  });

  const sandboxConfirmMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await apiClient.post(`/payments/sandbox/confirm/${encodeURIComponent(sessionId)}`);
    },
    onSuccess: () => {
      void statusQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ['donor-donations'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      void queryClient.invalidateQueries({ queryKey: ['public-transparency'] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Gagal mengonfirmasi pembayaran sandbox.');
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSession(true);
    setTimeout(() => setCopiedSession(false), 2000);
  };

  const liveStatus = statusQuery.data?.status ?? 'PENDING';
  const trackerStep =
    effectiveStep === 'form'
      ? 0
      : effectiveStep === 'review'
        ? 1
        : effectiveStep === 'payment'
          ? 2
          : 3;
  const isRejected = effectiveStep === 'payment' && (liveStatus === 'FAILED' || liveStatus === 'EXPIRED');

  const selectedCampaign = activeCampaigns.find((c) => String(c.id) === selectedCampaignId);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <Card>
        <JourneyTracker
          currentStep={trackerStep}
          rejected={isRejected}
          steps={['Isi Detail', 'Tinjau', 'Pembayaran QRIS', 'Selesai']}
        />
      </Card>

      {effectiveStep === 'form' && (
        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mint text-primary flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-forest-dark">Tunaikan Zakat</h1>
              <p className="text-xs text-slate-500">Pembayaran dalam Rupiah (IDR), bukan mata uang kripto.</p>
            </div>
          </div>

          <Select
            label="Jenis Zakat"
            value={zakatType}
            onChange={(e) => setZakatType(e.target.value)}
            options={ZAKAT_TYPES}
          />

          {activeCampaigns.length > 0 && (
            <Select
              label="Salurkan ke Program Tertentu (Disarankan)"
              placeholder="Pilih program atau biarkan umum"
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              options={[
                { value: '', label: 'Zakat Umum (Tanpa Program Spesifik)' },
                ...activeCampaigns.map((c) => ({ value: String(c.id), label: c.title })),
              ]}
            />
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slateText">
              Nominal Zakat (IDR)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String(val))}
                  className={`min-h-[42px] rounded-[10px] border text-xs font-semibold transition-colors tabular-nums ${
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
              placeholder="Atau ketik nominal Rupiah"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <Input
            label="Nama Muzakki (Opsional)"
            placeholder="Kosongkan untuk Hamba Allah"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
          />

          <Button
            variant="primary"
            size="lg"
            disabled={!amount || Number(amount) <= 0}
            onClick={() => {
              setError(null);
              setStep('review');
            }}
            className="w-full"
          >
            Tinjau Rincian Pembayaran
          </Button>
        </Card>
      )}

      {effectiveStep === 'review' && (
        <Card className="space-y-5">
          <h2 className="text-xl font-bold text-forest-dark">Tinjau Rincian Zakat</h2>

          <div className="rounded-xl bg-cream border border-slate-200 p-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-slate-600">Jenis</span>
              <span className="font-semibold text-forest-dark">
                {ZAKAT_TYPES.find((t) => t.value === zakatType)?.label}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-600">Tujuan Program</span>
              <span className="font-semibold text-forest-dark">
                {selectedCampaign ? selectedCampaign.title : 'Zakat Umum'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-600">Atas Nama</span>
              <span className="font-semibold text-forest-dark">{donorName.trim() || 'Hamba Allah'}</span>
            </div>
            <div className="flex justify-between gap-2 pt-2 border-t border-slate-200">
              <span className="font-bold text-forest-dark">Total Pembayaran</span>
              <span className="text-xl font-extrabold text-primary tabular-nums">
                {formatIDR(Number(amount))}
              </span>
            </div>
          </div>

          {!selectedCampaignId && (
            <div className="rounded-xl bg-mint border border-primary/20 p-3 text-xs text-forest">
              Pembayaran Zakat Umum akan tercatat langsung di riwayat donasi pribadi Anda (`/my-donations`).
            </div>
          )}

          {error && (
            <div role="alert" className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} /> <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="secondary" onClick={() => setStep('form')} className="sm:flex-1">
              Ubah Data
            </Button>
            <Button
              variant="gold"
              loading={sessionMutation.isPending}
              onClick={() => sessionMutation.mutate()}
              className="sm:flex-1"
            >
              <QrCode size={16} /> Konfirmasi & Buat QRIS
            </Button>
          </div>
        </Card>
      )}

      {effectiveStep === 'payment' && paymentData && (
        <Card className="space-y-5 text-center">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-forest-dark">Menunggu Pembayaran QRIS</h2>
            <Badge tone={liveStatus === 'FAILED' || liveStatus === 'EXPIRED' ? 'danger' : 'warning'}>
              {liveStatus === 'PENDING' ? 'Menunggu Konfirmasi' : liveStatus}
            </Badge>
          </div>

          <QrCodeBox
            value={paymentData.paymentData.qris_url}
            lanValue={paymentData.paymentData.lan_qris_url}
            size={188}
          />

          <div>
            <p className="text-2xl font-extrabold text-forest-dark tabular-nums">
              {formatIDR(paymentData.paymentData.amount)}
            </p>
            <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1">
              <Clock size={13} /> Berlaku hingga {formatDateTime(paymentData.paymentData.expires_at)}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                ID Sesi Pembayaran
              </span>
              <button
                type="button"
                onClick={() => handleCopy(paymentData.paymentData.session_id)}
                className="text-xs font-semibold text-primary inline-flex items-center gap-1"
              >
                {copiedSession ? <><Check size={12} /> Tersalin</> : <><Copy size={12} /> Salin</>}
              </button>
            </div>
            <p className="mt-1 font-mono text-xs font-bold text-forest-dark break-all">
              {paymentData.paymentData.session_id}
            </p>
          </div>

          <div className="p-3.5 bg-mint border border-primary/20 rounded-xl text-left text-xs text-forest flex items-start gap-2">
            <Info size={16} className="shrink-0 mt-0.5 text-primary" />
            <span>
              QRIS Sandbox aktif. Setelah webhook pembayaran mengonfirmasi transaksi, halaman ini otomatis beralih ke kuitansi.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="secondary" onClick={() => void statusQuery.refetch()} className="sm:flex-1">
              <RefreshCw size={15} /> Cek Status
            </Button>
            {import.meta.env.DEV && liveStatus === 'PENDING' && (
              <Button
                variant="gold"
                loading={sandboxConfirmMutation.isPending}
                onClick={() => sandboxConfirmMutation.mutate(paymentData.paymentData.session_id)}
                className="sm:flex-1"
              >
                <CheckCircle2 size={15} /> Simulasikan Bayar (Sandbox)
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                setPaymentData(null);
                setStep('form');
              }}
              className="sm:flex-1"
            >
              Buat Sesi Baru
            </Button>
          </div>
        </Card>
      )}

      {effectiveStep === 'success' && paymentData && (
        <Card className="text-center space-y-5">
          <div className="w-16 h-16 bg-mint text-primary rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-forest-dark">Pembayaran Terkonfirmasi</h2>
            <p className="text-sm text-slate-600 mt-1">
              Terima kasih {donorName.trim() || 'Sahabat Muzakki'}, pembayaran zakat Anda telah terkonfirmasi.
            </p>
          </div>
          <div className="bg-cream border border-slate-200 rounded-xl p-4 text-sm text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Referensi</span>
              <span className="font-mono font-bold text-xs text-forest-dark">{paymentData.paymentData.session_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Nominal</span>
              <span className="font-extrabold text-forest-dark tabular-nums">
                {formatIDR(paymentData.paymentData.amount)}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500">{ON_CHAIN_NOTE}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/my-donations"
              className="sm:flex-1 inline-flex items-center justify-center min-h-[44px] rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-forest"
            >
              Lihat Riwayat & Bukti
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setPaymentData(null);
                setAmount('');
                setStep('form');
              }}
              className="sm:flex-1"
            >
              Tunaikan Lagi
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DonationPayment;
