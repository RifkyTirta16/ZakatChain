import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CreditCard, QrCode, CheckCircle, Clock, Info, ArrowRight, AlertCircle } from 'lucide-react';
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

const createSession = async (form: { amount: string; donor_name: string; program_id: string }): Promise<PaymentSession> => {
  const { data } = await apiClient.post('/payments/session', form);
  return data;
};

const fetchStatus = async (sessionId: string): Promise<PaymentStatus> => {
  const { data } = await apiClient.get(`/payments/status/${sessionId}`);
  return data;
};

const PROGRAMS = [
  { value: 'general', label: 'Umum (General)' },
  { value: 'education', label: 'Pendidikan' },
  { value: 'health', label: 'Kesehatan' },
  { value: 'emergency', label: 'Bencana Alam' },
];

const DonationPayment = () => {
  const [step, setStep] = useState<'amount' | 'payment' | 'success'>('amount');
  const [formData, setFormData] = useState({ amount: '', donor_name: '', program_id: 'general' });
  const [paymentData, setPaymentData] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ['payment-status', paymentData?.paymentData.session_id],
    queryFn: () => fetchStatus(paymentData?.paymentData.session_id as string),
    enabled: step === 'payment' && Boolean(paymentData),
    refetchInterval: 5000,
  });

  // Status: PAID menutup wizard (render-phase update, bersyarat agar tidak berulang);
  // FAILED/EXPIRED wajib terlihat, bukan diam dipolling.
  if (statusQuery.data?.status === 'PAID' && step === 'payment') {
    setStep('success');
  }

  const sessionMutation = useMutation({
    mutationFn: () => createSession(formData),
    onSuccess: (data) => {
      setPaymentData(data);
      setStep('payment');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Gagal membuat sesi pembayaran');
    },
  });

  if (step === 'success' && paymentData) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="text-success" size={48} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-primary-dark">Pembayaran Berhasil!</h1>
              <p className="text-primary-dark/70 text-sm">
                Terima kasih {formData.donor_name || 'Sahabat'}, donasi Anda telah tercatat dalam
                sistem dan akan segera disalurkan.
              </p>
            </div>
            <div className="bg-cream p-5 rounded-xl text-sm text-left space-y-3">
              <div className="flex justify-between items-center gap-4">
                <span className="text-primary-dark/70">Session ID</span>
                <span className="text-primary-dark break-all">{paymentData.paymentData.session_id}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-primary-dark/70">Nominal</span>
                <span className="text-primary-dark font-bold">{formatIDR(paymentData.paymentData.amount)}</span>
              </div>
            </div>
            <Button variant="secondary" className="w-full" onClick={() => { setStep('amount'); setPaymentData(null); }}>
              Donasi lagi
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'payment' && paymentData) {
    const session = paymentData.paymentData;
    const failed = statusQuery.data?.status === 'FAILED' || statusQuery.data?.status === 'EXPIRED';
    return (
      <div className="max-w-md mx-auto">
        <Card>
          {failed ? (
            <ErrorState
              message={
                statusQuery.data?.status === 'EXPIRED'
                  ? 'Sesi pembayaran telah kedaluwarsa. Silakan buat sesi baru.'
                  : 'Pembayaran gagal diproses. Silakan coba lagi atau buat sesi baru.'
              }
              retry={() => { setStep('amount'); setPaymentData(null); }}
            />
          ) : (
            <div className="text-center space-y-5">
              <div className="flex justify-center items-center gap-2 text-primary mb-4">
                <QrCode size={24} />
                <span className="font-bold text-sm text-primary-dark">Pembayaran QRIS</span>
              </div>

              {statusQuery.isPending ? (
                <Skeleton lines={8} className="w-full rounded-xl" />
              ) : (
                <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-card">
                  <div className="w-52 h-52 bg-cream rounded-lg flex items-center justify-center text-primary-dark/70 font-bold text-center p-4 text-xs break-all">
                    {session.qris_url}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-2xl font-extrabold text-primary-dark">{formatIDR(session.amount)}</p>
                <div className="flex items-center justify-center gap-2 text-xs text-primary-dark/70">
                  <Clock size={12} />
                  <span>Berlaku hingga: {formatDateTime(session.expires_at)}</span>
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

              <p className="text-xs text-primary-dark/70 flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse" />
                Menunggu konfirmasi pembayaran...
              </p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CreditCard className="text-primary" size={30} />
            </div>
            <h1 className="text-2xl font-extrabold text-primary-dark mb-1">Donasi Zakat</h1>
            <p className="text-primary-dark/70 text-sm">Donasi transparan tercatat on-chain.</p>
          </div>

          {error && (
            <div role="alert" className="p-3 bg-coral/10 border border-coral/30 rounded-xl flex items-center gap-2 text-sm text-coral-dark">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="space-y-4">
            <label className="block text-sm font-medium text-primary-dark">
              Nama donatur
              <input
                type="text"
                className="mt-2 w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-3 text-sm text-primary-dark placeholder-primary-dark/50 outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Nama lengkap Anda"
                value={formData.donor_name}
                onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
              />
            </label>
            <label className="block text-sm font-medium text-primary-dark">
              Nominal (Rp)
              <input
                type="number"
                min="1"
                step="1"
                required
                className="mt-2 w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-3 text-sm text-primary-dark placeholder-primary-dark/50 outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </label>
            <label className="block text-sm font-medium text-primary-dark">
              Program zakat
              <select
                className="mt-2 w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-3 text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20"
                value={formData.program_id}
                onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
              >
                {PROGRAMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>
          </div>

          <Button
            className="w-full"
            disabled={!formData.amount || !formData.donor_name}
            loading={sessionMutation.isPending}
            onClick={() => sessionMutation.mutate()}
          >
            Lanjutkan Pembayaran <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DonationPayment;
