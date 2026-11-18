import { useState } from 'react';
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
  const { data } = await apiClient.post('/payments/create', {
    amount,
    program_id: 'Zakat-General',
    donor_name: 'Anonymous',
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
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

  if (!isOpen) return null;

  const initiatePayment = async () => {
    setError('');
    setStatus('PROCESSING');
    try {
      setPaymentData(await initiateSession(amount, token));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md relative">
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-3 right-3 rounded-lg p-2 text-primary-dark/70 hover:bg-primary-bg outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-xl font-extrabold text-primary-dark">Konfirmasi Pembayaran</h2>
          <p className="text-sm text-primary-dark/70 mt-1">Donasi tercatat aman dan transparan.</p>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
            {error}
          </p>
        )}

        {status === 'IDLE' && (
          <div className="text-center space-y-6">
            <div className="p-6 bg-cream rounded-xl">
              <p className="text-xs text-primary-dark/70 mb-1">Nominal pembayaran</p>
              <p className="text-2xl font-extrabold text-primary-dark">{formatIDR(amount)}</p>
            </div>
            <Button className="w-full" onClick={() => void initiatePayment()}>
              <QrCode size={16} className="mr-2" /> Generate QRIS
            </Button>
          </div>
        )}

        {status === 'PROCESSING' && (
          <div className="flex flex-col items-center py-8 space-y-5">
            <Button loading>Memproses...</Button>
            {paymentData && (
              <button
                onClick={() => void checkStatus()}
                className="inline-flex items-center min-h-[44px] rounded-full border-2 border-primary px-6 text-sm font-bold text-primary-dark shadow-teal-glow outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Saya sudah bayar
              </button>
            )}
          </div>
        )}

        {paymentData && (status === 'PAID' || status === 'FAILED') && (
          <div className="text-center space-y-5">
            <div className="p-4 bg-cream rounded-xl">
              <div className="w-44 h-44 mx-auto bg-white rounded-lg flex items-center justify-center text-primary-dark/70 font-bold text-center p-3 text-xs break-all">
                {paymentData.paymentData.qris_url}
              </div>
            </div>
            <Badge tone={status === 'PAID' ? 'success' : 'coral'}>
              {status === 'PAID' ? 'Pembayaran berhasil' : 'Pembayaran gagal'}
            </Badge>
            <div className="flex justify-center">
              {status === 'PAID' ? (
                <CheckCircle2 className="text-success" size={40} />
              ) : (
                <AlertTriangle className="text-coral" size={40} />
              )}
            </div>
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
