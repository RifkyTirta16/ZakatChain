import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, QrCode, RefreshCw, X } from 'lucide-react';
import apiClient from '../utils/api';
import { formatIDR } from '../utils/format';
import { Badge, Button, Card, JourneyTracker, ON_CHAIN_NOTE } from './ui';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  campaignId?: number;
}

interface PaymentSession {
  paymentData: {
    session_id: string;
    qris_url: string;
    expires_at?: string;
  };
}

type ModalStatus = 'IDLE' | 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';

const PaymentModal = ({ isOpen, onClose, amount, campaignId }: PaymentModalProps) => {
  const [paymentData, setPaymentData] = useState<PaymentSession | null>(null);
  const [status, setStatus] = useState<ModalStatus>('IDLE');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setPaymentData(null);
    setStatus('IDLE');
    setError('');
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPaymentData(null);
        setStatus('IDLE');
        setError('');
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const initiatePayment = async () => {
    setError('');
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        amount,
        program_id: campaignId ? String(campaignId) : 'Zakat-General',
      };
      if (campaignId) payload.campaign_id = campaignId;
      const { data } = await apiClient.post<PaymentSession>('/payments/create', payload);
      setPaymentData(data);
      setStatus('PENDING');
    } catch {
      setError('Gagal membuat sesi pembayaran. Pastikan Anda sudah masuk dan nominal valid.');
      setStatus('FAILED');
    } finally {
      setBusy(false);
    }
  };

  const checkStatus = async () => {
    if (!paymentData) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await apiClient.get<{ status: string }>(
        `/payments/verify/${paymentData.paymentData.session_id}`,
      );
      if (data.status === 'PAID') setStatus('PAID');
      else if (data.status === 'EXPIRED') setStatus('EXPIRED');
      else if (data.status === 'FAILED') setStatus('FAILED');
      else setStatus('PENDING');
    } catch {
      setError('Gagal memeriksa status pembayaran. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const currentStep = status === 'IDLE' ? 1 : status === 'PENDING' ? 2 : 3;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest-dark/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <Card className="w-full max-w-md relative p-6 sm:p-7 space-y-5 shadow-elevated">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Tutup modal"
          className="absolute top-4 right-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <X size={18} />
        </button>

        <div>
          <h2 className="text-lg font-bold text-forest-dark">Konfirmasi Pembayaran Zakat</h2>
          <p className="text-xs text-slate-500 mt-0.5">Pembayaran diproses dalam Rupiah (IDR).</p>
        </div>

        <JourneyTracker
          size="sm"
          currentStep={currentStep}
          rejected={status === 'FAILED' || status === 'EXPIRED'}
          steps={['Nominal', 'Buat Sesi', 'Bayar QRIS', 'Selesai']}
        />

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-medium">
            {error}
          </p>
        )}

        {status === 'IDLE' && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-cream border border-slate-200 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Nominal Zakat</p>
              <p className="mt-1 text-2xl font-extrabold text-forest-dark tabular-nums">{formatIDR(amount)}</p>
            </div>
            <Button variant="primary" loading={busy} onClick={() => void initiatePayment()} className="w-full">
              <QrCode size={16} /> Buat Kode Pembayaran QRIS
            </Button>
          </div>
        )}

        {status === 'PENDING' && paymentData && (
          <div className="space-y-4 text-center">
            <Badge tone="warning">Menunggu Pembayaran</Badge>
            <div className="p-3 bg-cream rounded-xl inline-block border border-slate-200">
              <div className="w-44 h-44 bg-white rounded-lg flex items-center justify-center text-forest-dark font-mono text-xs break-all p-3 border border-slate-200">
                {paymentData.paymentData.qris_url}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-left text-xs">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">ID Sesi</span>
              <span className="font-mono font-bold text-forest-dark break-all">
                {paymentData.paymentData.session_id}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="primary" loading={busy} onClick={() => void checkStatus()} className="w-full">
                <RefreshCw size={15} /> Cek Status Pembayaran
              </Button>
              <p className="text-[11px] text-slate-500">{ON_CHAIN_NOTE}</p>
            </div>
          </div>
        )}

        {status === 'PAID' && (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 bg-mint text-primary rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <Badge tone="success">Pembayaran Terkonfirmasi</Badge>
            <p className="text-sm text-slate-600">
              Jazakumullahu khairan. Pembayaran sebesar <strong>{formatIDR(amount)}</strong> telah terkonfirmasi.
            </p>
            <Button variant="primary" onClick={handleClose} className="w-full">
              Selesai
            </Button>
          </div>
        )}

        {(status === 'FAILED' || status === 'EXPIRED') && (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 bg-red-50 text-danger rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={30} />
            </div>
            <Badge tone="danger">{status === 'EXPIRED' ? 'Sesi Kedaluwarsa' : 'Pembayaran Gagal'}</Badge>
            <p className="text-sm text-slate-600">
              {status === 'EXPIRED'
                ? 'Batas waktu sesi QRIS telah berakhir. Silakan buat sesi baru.'
                : 'Pembayaran belum dapat diproses. Silakan coba kembali.'}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleClose} className="flex-1">Tutup</Button>
              <Button variant="primary" onClick={() => { setStatus('IDLE'); setPaymentData(null); }} className="flex-1">
                Ulangi
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PaymentModal;
