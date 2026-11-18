import { useState } from 'react';
import { X, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import axios from 'axios';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
}

const PaymentModal = ({ isOpen, onClose, amount }: PaymentModalProps) => {
  const [paymentData, setPaymentData] = useState<any>(null);
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'PAID' | 'FAILED'>('IDLE');
  const token = localStorage.getItem('zakat_token');

  if (!isOpen) return null;

  const initiatePayment = async () => {
    setStatus('PROCESSING');
    try {
      const response = await axios.post('http://localhost:5000/api/payments/create', {
        amount,
        program_id: 'Zakat-General',
        donor_name: 'Anonymous'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaymentData(response.data);
    } catch (error) {
      alert('Payment failed to initialize');
      setStatus('FAILED');
    }
  };

  const checkStatus = async () => {
    if (!paymentData) return;
    setStatus('PROCESSING');
    try {
      const response = await axios.get(`http://localhost:5000/api/payments/verify/${paymentData.paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === 'PAID') {
        setStatus('PAID');
      }
    } catch (error) {
      setStatus('FAILED');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[#101010] border border-[#D4AF37] p-8 max-w-md w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X size={20} />
        </button>
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black uppercase italic text-white mb-2">Secure Payment</h2>
          <p className="text-gray-500 uppercase text-[10px] tracking-widest">Luxury Zakat Distribution</p>
        </div>

        {status === 'IDLE' && (
          <div className="text-center space-y-6">
            <div className="p-6 bg-black border border-gray-800">
              <p className="text-xs text-gray-500 uppercase mb-1">Amount to Pay</p>
              <p className="text-3xl font-black text-white">Rp {amount.toLocaleString('id-ID')}</p>
            </div>
            <button 
              onClick={initiatePayment}
              className="w-full py-4 gold-bg text-black font-black uppercase tracking-widest hover:bg-[#FFD76A] transition-all"
            >
              Generate QRIS
            </button>
          </div>
        )}

        {status === 'PROCESSING' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <Loader2 className="animate-spin text-[#D4AF37]" size={48} />
            <p className="text-xs uppercase tracking-widest text-gray-400">Processing Transaction...</p>
            {paymentData && (
              <button 
                onClick={checkStatus}
                className="px-6 py-2 border border-[#D4AF37] text-[#D4AF37] text-xs uppercase font-bold hover:bg-[#D4AF37]/10 transition-all"
              >
                I have paid
              </button>
            )}
          </div>
        )}

        {paymentData && status !== 'PROCESSING' && status !== 'IDLE' && (
          <div className="text-center space-y-6">
            <div className="bg-white p-4 inline-block shadow-xl">
              <img src={paymentData.qrCodeUrl} alt="QRIS" className="w-48 h-48" />
            </div>
            {status === 'PAID' ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="text-emerald-500" size={48} />
                <p className="text-emerald-500 font-black uppercase tracking-widest">Payment Successful</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <AlertTriangle className="text-red-500" size={48} />
                <p className="text-red-500 font-black uppercase tracking-widest">Payment Failed</p>
              </div>
            )}
            <button 
              onClick={onClose}
              className="w-full py-3 bg-gray-800 text-white uppercase text-xs font-bold tracking-widest"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
