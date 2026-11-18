import { useState, useEffect } from 'react';
import { CreditCard, QrCode, CheckCircle, Clock, AlertCircle, Info, ArrowRight } from 'lucide-react';
import apiClient from '../utils/api';

const DonationPayment = () => {
  const [step, setStep] = useState<'amount' | 'payment' | 'success'>('amount');
  const [formData, setFormData] = useState({ amount: '', donor_name: '', program_id: 'general' });
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/payments/session', formData);
      setPaymentData(response.data);
      setStep('payment');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal membuat sesi pembayaran');
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async () => {
    if (!paymentData?.session_id) return;
    try {
      const response = await apiClient.get(`/payments/status/${paymentData.session_id}`);
      if (response.data.status === 'PAID') {
        setStep('success');
      }
    } catch (err) {
      console.error('Polling error', err);
    }
  };

  useEffect(() => {
    let interval: any;
    if (step === 'payment') {
      interval = setInterval(pollPaymentStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [step, paymentData]);

  return (
    <div className="min-h-screen bg-wattvision-bg p-8 text-wattvision-textMain font-sans flex items-center justify-center">
      <div className="max-w-md w-full bg-wattvision-surface border border-wattvision-border p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-wattvision-primary to-transparent" />

        {step === 'amount' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-wattvision-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-wattvision-primary/20 shadow-lg shadow-cyan-500/10">
                <CreditCard className="text-wattvision-primary" size={32} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight uppercase italic mb-2">
                Donasi <span className="text-wattvision-primary">Zakat</span>
              </h2>
              <p className="text-wattvision-textSecondary text-xs uppercase tracking-widest font-medium">Secure Blockchain Donation</p>
            </div>

            {error && (
              <div className="p-3 bg-wattvision-alertBg text-wattvision-alert border border-wattvision-alert/20 rounded-xl flex items-center gap-2 text-xs font-medium">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-widest text-wattvision-textSecondary font-bold ml-1">Nama Donatur</label>
                <input 
                  type="text" 
                  className="w-full bg-wattvision-bg border border-wattvision-border rounded-xl p-3 focus:outline-none focus:border-wattvision-primary transition-colors text-sm"
                  placeholder="Nama lengkap Anda"
                  value={formData.donor_name}
                  onChange={e => setFormData({...formData, donor_name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-widest text-wattvision-textSecondary font-bold ml-1">Nominal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-wattvision-textSecondary font-mono text-xs">Rp</span>
                  <input 
                    type="number" 
                    className="w-full bg-wattvision-bg border border-wattvision-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-wattvision-primary transition-colors font-mono text-sm"
                    placeholder="0"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-widest text-wattvision-textSecondary font-bold ml-1">Program Zakat</label>
                <select 
                  className="w-full bg-wattvision-bg border border-wattvision-border rounded-xl p-3 focus:outline-none focus:border-wattvision-primary transition-colors text-sm"
                  value={formData.program_id}
                  onChange={e => setFormData({...formData, program_id: e.target.value})}
                >
                  <option value="general">Umum (General)</option>
                  <option value="education">Pendidikan</option>
                  <option value="health">Kesehatan</option>
                  <option value="emergency">Bencana Alam</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleCreateSession}
              disabled={loading || !formData.amount || !formData.donor_name}
              className="w-full bg-wattvision-primary text-black font-bold py-4 rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 uppercase tracking-widest text-xs"
            >
              {loading ? 'Processing...' : (
                <>
                  Lanjutkan Pembayaran <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        )}

        {step === 'payment' && paymentData && (
          <div className="text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex justify-center items-center gap-2 text-wattvision-primary mb-4">
              <QrCode size={24} />
              <span className="font-bold uppercase tracking-widest text-xs">QRIS Payment Gateway</span>
            </div>
            
            <div className="bg-white p-4 rounded-3xl inline-block mx-auto shadow-xl">
              <img src={paymentData.qris_url} alt="QRIS" className="w-56 h-56" />
            </div>

            <div className="space-y-2">
              <p className="text-2xl font-bold font-mono text-wattvision-primary">Rp {Number(paymentData.amount).toLocaleString()}</p>
              <div className="flex items-center justify-center gap-2 text-[10px] text-wattvision-textSecondary uppercase tracking-tighter">
                <Clock size={12} />
                <span>Berlaku hingga: {new Date(paymentData.expires_at).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="p-5 bg-wattvision-bg rounded-2xl border border-wattvision-border text-xs text-left space-y-3">
              <p className="font-bold flex items-center gap-2 text-wattvision-primary uppercase tracking-widest text-[10px]">
                <Info size={14} /> Instruksi Pembayaran:
              </p>
              <ul className="space-y-2 text-wattvision-textSecondary list-decimal list-inside font-medium">
                <li>Scan QRIS di atas menggunakan aplikasi pembayaran (GOPAY, OVO, Dana, dll)</li>
                <li>Pastikan nominal sesuai dengan yang tertera</li>
                <li>Sistem akan memverifikasi pembayaran secara otomatis</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-6 animate-in fade-in scale-in-95">
            <div className="w-20 h-20 bg-wattvision-success/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-wattvision-success/30">
              <CheckCircle className="text-wattvision-success" size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight uppercase italic">Pembayaran <span className="text-wattvision-success">Berhasil!</span></h2>
              <p className="text-wattvision-textSecondary text-sm px-4">
                Terima kasih {formData.donor_name}, donasi Anda telah tercatat dalam sistem dan akan segera disalurkan.
              </p>
            </div>
            <div className="bg-wattvision-bg p-5 rounded-2xl border border-wattvision-border font-mono text-xs text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-wattvision-textSecondary uppercase tracking-widest">Session ID:</span>
                <span className="text-wattvision-textMain break-all ml-4">{paymentData.session_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-wattvision-textSecondary uppercase tracking-widest">Nominal:</span>
                <span className="text-wattvision-primary font-bold">Rp {Number(paymentData.amount).toLocaleString()}</span>
              </div>
            </div>
            <button 
              onClick={() => setStep('amount')}
              className="w-full bg-wattvision-surface border border-wattvision-border py-4 rounded-2xl hover:bg-wattvision-hover transition-colors uppercase tracking-widest text-xs font-bold"
            >
              Kembali ke Beranda
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationPayment;
