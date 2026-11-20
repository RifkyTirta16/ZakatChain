import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CreditCard, QrCode, CheckCircle, Clock, Info, ArrowRight, AlertCircle, Check, Copy } from 'lucide-react';
import apiClient from '../utils/api';
import { formatIDR, formatDateTime } from '../utils/format';
import { Button, Card, ErrorState, Skeleton } from '../components/ui';

interface PaymentSession {
  status: string;
  paymentData: {
    session_id: string;
    qris_url: string;
    amount: number;
    expires_at: string;
  };
}

interface PaymentStatus {
  session_id: string;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED';
  amount: number;
}

const PRESET_AMOUNTS = [50000, 100000, 250000, 500000];

const createSession = async (form: { amount: string; donor_name: string; program_id: string }): Promise<PaymentSession> => {
  const { data } = await apiClient.post('/payments/session', form);
  return data;
};

const fetchStatus = async (sessionId: string): Promise<PaymentStatus> => {
  const { data } = await apiClient.get(`/payments/status/${sessionId}`);
  return data;
};

const PROGRAMS = [
  { value: 'general', label: 'Zakat Umum (General)' },
  { value: 'education', label: 'Pendidikan Mustahik' },
  { value: 'health', label: 'Layanan Kesehatan Dhuafa' },
  { value: 'emergency', label: 'Tanggap Bencana & Kemanusiaan' },
];

const DonationPayment = () => {
  const [step, setStep] = useState<'amount' | 'payment' | 'success'>('amount');
  const [formData, setFormData] = useState({ amount: '', donor_name: '', program_id: 'general' });
  const [paymentData, setPaymentData] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedSession, setCopiedSession] = useState(false);

  const statusQuery = useQuery({
    queryKey: ['payment-status', paymentData?.paymentData.session_id],
    queryFn: () => fetchStatus(paymentData?.paymentData.session_id as string),
    enabled: step === 'payment' && Boolean(paymentData),
    refetchInterval: 5000,
  });

  if (statusQuery.data?.status === 'PAID' && step === 'payment') {
    setStep('success');
  }

  const sessionMutation = useMutation({
    mutationFn: () => createSession(formData),
    onSuccess: (data) => {
      setPaymentData(data);
      setStep('payment');
      setError(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Gagal membuat sesi pembayaran');
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSession(true);
    setTimeout(() => setCopiedSession(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F6F8F8] py-10 px-4 sm:px-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Stepper Indikator 3 Langkah */}
        <div className="flex items-center justify-between px-2 text-xs font-bold text-primary-dark/60">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step === 'amount'
                  ? 'bg-primary text-white'
                  : 'bg-primary/20 text-primary-dark font-extrabold'
              }`}
            >
              1
            </span>
            <span className={step === 'amount' ? 'text-primary-dark font-extrabold' : ''}>
              Nominal
            </span>
          </div>

          <div className="h-0.5 w-8 bg-slate-200" />

          <div className="flex items-center gap-1.5">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step === 'payment'
                  ? 'bg-primary text-white'
                  : step === 'success'
                    ? 'bg-primary/20 text-primary-dark font-extrabold'
                    : 'bg-slate-200 text-slate-500'
              }`}
            >
              2
            </span>
            <span className={step === 'payment' ? 'text-primary-dark font-extrabold' : ''}>
              QRIS
            </span>
          </div>

          <div className="h-0.5 w-8 bg-slate-200" />

          <div className="flex items-center gap-1.5">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step === 'success' ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              3
            </span>
            <span className={step === 'success' ? 'text-primary-dark font-extrabold' : ''}>
              Selesai
            </span>
          </div>
        </div>

        {/* Langkah 3: Sukses Terkonfirmasi */}
        {step === 'success' && paymentData && (
          <Card className="rounded-2xl p-6 sm:p-8 bg-white border border-slate-200/70 shadow-card">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto text-success">
                <CheckCircle size={40} />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-2xl font-extrabold text-primary-dark">Pembayaran Berhasil!</h1>
                <p className="text-primary-dark/70 text-xs sm:text-sm leading-relaxed">
                  Terima kasih <span className="font-bold text-primary-dark">{formData.donor_name || 'Sahabat'}</span>, donasi Anda telah berstatus tercatat dalam sistem transparansi ZakatChain.
                </p>
              </div>

              <div className="bg-cream/80 border border-cream p-4 rounded-xl text-xs sm:text-sm text-left space-y-2.5">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-primary-dark/60 font-medium">Referensi Pembayaran</span>
                  <span className="text-primary-dark font-mono font-bold text-xs truncate max-w-[180px]">
                    {paymentData.paymentData.session_id}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-primary-dark/60 font-medium">Nominal Donasi</span>
                  <span className="text-primary-dark font-extrabold tabular-nums">
                    {formatIDR(paymentData.paymentData.amount)}
                  </span>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setStep('amount');
                  setPaymentData(null);
                  setFormData({ amount: '', donor_name: '', program_id: 'general' });
                }}
              >
                Salurkan Donasi Baru
              </Button>
            </div>
          </Card>
        )}

        {/* Langkah 2: Menunggu Pembayaran QRIS */}
        {step === 'payment' && paymentData && (
          <Card className="rounded-2xl p-6 sm:p-8 bg-white border border-slate-200/70 shadow-card">
            {statusQuery.data?.status === 'FAILED' || statusQuery.data?.status === 'EXPIRED' ? (
              <ErrorState
                message={
                  statusQuery.data?.status === 'EXPIRED'
                    ? 'Sesi pembayaran telah kedaluwarsa. Silakan buat sesi donasi baru.'
                    : 'Pembayaran gagal diverifikasi. Silakan coba lagi atau buat sesi baru.'
                }
                retry={() => {
                  setStep('amount');
                  setPaymentData(null);
                }}
              />
            ) : (
              <div className="text-center space-y-5">
                <div className="flex justify-center items-center gap-2 text-primary">
                  <QrCode size={20} />
                  <span className="font-extrabold text-sm text-primary-dark uppercase tracking-wider">
                    Pindai Kode QRIS
                  </span>
                </div>

                {statusQuery.isPending ? (
                  <Skeleton lines={7} className="w-full rounded-xl" />
                ) : (
                  <div className="bg-primary-bg/20 p-4 rounded-2xl inline-block mx-auto border border-primary-bg shadow-sm">
                    <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center text-primary-dark/70 font-mono text-xs break-all p-4 border border-slate-200/80">
                      {paymentData.paymentData.qris_url}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-2xl font-extrabold text-primary-dark tabular-nums">
                    {formatIDR(paymentData.paymentData.amount)}
                  </p>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-primary-dark/60 font-medium">
                    <Clock size={12} />
                    <span>Berlaku hingga: {formatDateTime(paymentData.paymentData.expires_at)}</span>
                  </div>
                </div>

                <div className="bg-cream/80 border border-cream p-3 rounded-xl text-left">
                  <p className="text-[10px] uppercase tracking-wider text-primary-dark/60 font-semibold mb-0.5">
                    Session ID
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-primary-dark truncate">
                      {paymentData.paymentData.session_id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(paymentData.paymentData.session_id)}
                      className="p-1 rounded text-primary-dark/70 hover:bg-white text-xs inline-flex items-center gap-1 shrink-0"
                      title="Salin ID Sesi"
                    >
                      {copiedSession ? (
                        <span className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                          <Check size={12} /> Tersalin
                        </span>
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-primary-bg/40 rounded-xl text-xs text-left space-y-2 text-primary-dark/80">
                  <p className="font-bold flex items-center gap-1.5 text-primary-dark text-xs">
                    <Info size={14} className="text-primary" /> Panduan Pembayaran
                  </p>
                  <ol className="space-y-1.5 text-[11px] text-primary-dark/70 list-decimal list-inside leading-relaxed">
                    <li>Buka aplikasi m-banking atau e-wallet pilihan Anda.</li>
                    <li>Pindai atau masukkan payload QRIS di atas.</li>
                    <li>Sistem ZakatChain akan otomatis mengonfirmasi saat dana diterima.</li>
                  </ol>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-primary-dark/70 flex items-center justify-center gap-2 font-medium">
                    <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse" />
                    Menunggu konfirmasi pembayaran otomatis...
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('amount');
                      setPaymentData(null);
                    }}
                    className="mt-3 text-xs font-semibold text-primary-dark/70 hover:text-primary-dark hover:underline py-1"
                  >
                    Batal dan ganti nominal
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Langkah 1: Input Nominal & Data Donatur */}
        {step === 'amount' && (
          <Card className="rounded-2xl p-6 sm:p-8 bg-white border border-slate-200/70 shadow-card">
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-primary-bg rounded-2xl flex items-center justify-center mx-auto mb-3 text-primary">
                  <CreditCard size={26} />
                </div>
                <h1 className="text-2xl font-extrabold text-primary-dark">Donasi Zakat</h1>
                <p className="text-primary-dark/70 text-xs sm:text-sm mt-1">
                  Penyaluran zakat dan infaq transparan tercatat di blockchain.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3 bg-coral/10 border border-coral/30 rounded-xl flex items-center gap-2 text-xs sm:text-sm text-coral-dark font-medium"
                >
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <label className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold">
                  Nama Donatur / Hamba Allah
                  <input
                    type="text"
                    required
                    className="mt-1.5 w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-2.5 text-sm text-primary-dark placeholder-primary-dark/40 outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                    placeholder="Contoh: Ahmad Fauzi"
                    value={formData.donor_name}
                    onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
                  />
                </label>

                <div>
                  <span className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold mb-2">
                    Pilihan Nominal Cepat
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setFormData({ ...formData, amount: String(amt) })}
                        className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                          formData.amount === String(amt)
                            ? 'bg-primary text-white border-primary shadow-teal-glow'
                            : 'bg-primary-bg/50 border-primary-bg text-primary-dark hover:bg-primary-bg'
                        }`}
                      >
                        {formatIDR(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold">
                  Nominal Donasi Lainnya (Rp)
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    className="mt-1.5 w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-2.5 text-sm text-primary-dark placeholder-primary-dark/40 outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                    placeholder="Masukkan nominal bebas"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </label>

                <label className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold">
                  Program Penyaluran
                  <select
                    className="mt-1.5 w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-2.5 text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20 font-medium cursor-pointer"
                    value={formData.program_id}
                    onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                  >
                    {PROGRAMS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Aksi Utama Tunggal: Lanjutkan ke Pembayaran */}
              <button
                type="button"
                disabled={!formData.amount || !formData.donor_name || sessionMutation.isPending}
                onClick={() => sessionMutation.mutate()}
                className="w-full inline-flex items-center justify-center min-h-[44px] rounded-full bg-gradient-to-br from-gold to-gold-light text-primary-dark font-bold text-sm shadow-gold-glow outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {sessionMutation.isPending ? 'Menyiapkan Sesi...' : 'Lanjutkan Pembayaran QRIS'}
                <ArrowRight size={16} className="ml-2" />
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DonationPayment;
