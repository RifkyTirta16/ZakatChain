import { useState, useEffect } from 'react';
import { X, CheckCircle2, QrCode, AlertTriangle } from 'lucide-react';
import apiClient from '../utils/api';
import { formatIDR } from '../utils/format';
import { Badge, Button, Card } from './ui';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
}

interface PaymentSession {
  paymentData: {
    session_id: string;
    qris_url: string;
  };
}

type ModalStatus = 'IDLE' | 'PROCESSING' | 'PAID' | 'FAILED';

const initiateSession = async (amount: number, token: string | null): Promise<PaymentSession> => {
  const { data } = await apiClient.post(
    '/payments/create',
    {
      amount,
      program_id: 'Zakat-General',
      donor_name: 'Anonymous',
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return data;
};

const verifySession = async (paymentId: string, token: string | null): Promise<string> => {
  const { data } = await apiClient.get(`/payments/verify/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.status;
};

const PaymentModal = ({ isOpen, onClose, amount }: PaymentModalProps) => {
  const [paymentData, setPaymentData] = useState<PaymentSession | null>(null);
  const [status, setStatus] = useState<ModalStatus>('IDLE');
  const [error, setError] = useState('');
  const token = localStorage.getItem('zakat_token');

  // Menutup modal dengan tombol Escape sesuai spesifikasi tracker
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const initiatePayment = async () => {
    setError('');
    setStatus('PROCESSING');
    try {
      const res = await initiateSession(amount, token);
      setPaymentData(res);
      setStatus('PROCESSING');
    } catch {
      setError('Gagal membuat sesi pembayaran. Periksa koneksi dan pastikan Anda sudah masuk.');
      setStatus('FAILED');
    }
  };

  const checkStatus = async () => {
    if (!paymentData) return;
    setStatus('PROCESSING');
    try {
      const result = await verifySession(paymentData.paymentData.session_id, token);
      setStatus(result === 'PAID' ? 'PAID' : 'FAILED');
    } catch {
      setError('Gagal memeriksa status pembayaran. Coba lagi.');
      setStatus('FAILED');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="w-full max-w-md rounded-3xl p-6 sm:p-8 bg-white shadow-2xl relative border border-slate-200/80">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-4 right-4 rounded-xl p-2 text-primary-dark/60 hover:text-primary-dark hover:bg-primary-bg outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-xl font-extrabold text-primary-dark">Konfirmasi Pembayaran</h2>
          <p className="text-xs sm:text-sm text-primary-dark/70 mt-1">
            Donasi zakat transparan tercatat di blockchain.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-coral/40 bg-coral/10 p-3 text-xs sm:text-sm text-coral-dark font-medium"
          >
            {error}
          </p>
        )}

        {status === 'IDLE' && (
          <div className="text-center space-y-6">
            <div className="p-5 bg-cream/80 border border-cream rounded-2xl">
              <p className="text-xs uppercase tracking-wider text-primary-dark/60 font-semibold mb-1">
                Ringkasan Nominal
              </p>
              <p className="text-2xl font-extrabold text-primary-dark tabular-nums">
                {formatIDR(amount)}
              </p>
            </div>

            <Button className="w-full" onClick={() => void initiatePayment()}>
              <QrCode size={16} className="mr-2" /> Buat Pembayaran QRIS
            </Button>
          </div>
        )}

        {status === 'PROCESSING' && (
          <div className="flex flex-col items-center py-4 space-y-5">
            {paymentData ? (
              <div className="text-center space-y-4 w-full">
                <div className="p-3 bg-primary-bg/20 rounded-2xl inline-block border border-primary-bg">
                  <div className="w-44 h-44 bg-white rounded-xl flex items-center justify-center text-primary-dark/70 font-mono text-xs break-all p-3 border border-slate-200/80">
                    {paymentData.paymentData.qris_url}
                  </div>
                </div>

                <div className="bg-cream/80 border border-cream p-3 rounded-xl text-xs text-left">
                  <span className="text-[10px] uppercase tracking-wider text-primary-dark/60 font-semibold block mb-0.5">
                    Sesi ID
                  </span>
                  <span className="font-mono font-bold text-primary-dark break-all">
                    {paymentData.paymentData.session_id}
                  </span>
                </div>

                <div className="pt-2 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => void checkStatus()}
                    className="w-full inline-flex items-center justify-center min-h-[44px] rounded-full bg-gradient-to-br from-gold to-gold-light text-primary-dark font-bold text-sm shadow-gold-glow outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform active:scale-95"
                  >
                    Saya Sudah Bayar
                  </button>

                  <Button variant="secondary" onClick={onClose}>
                    Batal
                  </Button>
                </div>
              </div>
            ) : (
              <Button loading>Menyiapkan QRIS...</Button>
            )}
          </div>
        )}

        {paymentData && (status === 'PAID' || status === 'FAILED') && (
          <div className="text-center space-y-5 py-2">
            <div className="flex justify-center">
              <Badge tone={status === 'PAID' ? 'success' : 'coral'}>
                {status === 'PAID' ? 'Pembayaran Berhasil' : 'Pembayaran Belum Diterima'}
              </Badge>
            </div>

            <div className="flex justify-center">
              {status === 'PAID' ? (
                <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center text-success">
                  <CheckCircle2 size={36} />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-coral/15 flex items-center justify-center text-coral">
                  <AlertTriangle size={36} />
                </div>
              )}
            </div>

            <p className="text-xs text-primary-dark/70 leading-relaxed max-w-xs mx-auto">
              {status === 'PAID'
                ? 'Donasi Anda telah terverifikasi dan tercatat dalam sistem transparansi.'
                : 'Sistem belum mendeteksi pembayaran. Silakan coba lagi atau periksa riwayat mutasi Anda.'}
            </p>

            <Button variant="secondary" className="w-full" onClick={onClose}>
              Tutup
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PaymentModal;
