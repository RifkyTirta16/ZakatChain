import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Clock, Info } from 'lucide-react';
import apiClient from '../utils/api';

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const response = await apiClient.get(`/campaigns/${id}`);
        setCampaign(response.data);
      } catch (err) {
        console.error('Failed to fetch campaign detail');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/payment/generate', {
        campaign_id: id,
        amount: parseFloat(amount),
      });
      setPaymentResult(response.data);
    } catch (err: any) {
      alert('Payment generation failed');
    }
  };

  if (loading) return <div className="min-h-screen bg-wattvision-bg flex items-center justify-center text-wattvision-primary font-mono animate-pulse">Loading Intelligence...</div>;
  if (!campaign) return <div className="min-h-screen bg-wattvision-bg flex items-center justify-center text-wattvision-alert font-mono">Campaign Not Found</div>;

  return (
    <div className="min-h-screen bg-wattvision-bg p-8 text-wattvision-textMain font-sans">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-wattvision-textSecondary hover:text-white transition-colors mb-8 text-xs uppercase tracking-widest font-bold"
      >
        <ArrowLeft size={14} /> Back to Campaigns
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-wattvision-surface border border-wattvision-border p-8 rounded-3xl shadow-xl">
            <h1 className="text-4xl font-bold uppercase italic tracking-tight mb-4">{campaign.title}</h1>
            <p className="text-wattvision-textSecondary leading-relaxed mb-8">{campaign.description}</p>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-wattvision-bg rounded-2xl border border-wattvision-border">
                <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mb-1">Target</p>
                <p className="text-lg font-bold font-mono">Rp {campaign.target_amount?.toLocaleString('id-ID')}</p>
              </div>
              <div className="p-4 bg-wattvision-bg rounded-2xl border border-wattvision-border">
                <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mb-1">Confirmed</p>
                <p className="text-lg font-bold font-mono text-wattvision-success">Rp {campaign.total_confirmed?.toLocaleString('id-ID')}</p>
              </div>
              <div className="p-4 bg-wattvision-bg rounded-2xl border border-wattvision-border">
                <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mb-1">Progress</p>
                <p className="text-lg font-bold font-mono text-wattvision-primary">
                  {((campaign.total_confirmed / campaign.target_amount) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-wattvision-surface border border-wattvision-border p-8 rounded-3xl shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
              <Clock size={16} className="text-wattvision-primary" /> Donation History
            </h3>
            <div className="space-y-3">
              {campaign.donations.length === 0 ? (
                <p className="text-wattvision-textSecondary text-xs italic uppercase tracking-widest">No confirmed donations yet</p>
              ) : (
                campaign.donations.map((d: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-wattvision-bg rounded-2xl border border-wattvision-border">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${d.status === 'CONFIRMED' ? 'bg-wattvision-success' : 'bg-wattvision-alert'}`} />
                      <span className="text-xs font-mono uppercase">{d.status}</span>
                    </div>
                    <span className="text-sm font-bold font-mono">Rp {d.amount?.toLocaleString('id-ID')}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-wattvision-surface border border-wattvision-border p-8 rounded-3xl shadow-xl sticky top-8">
            <h3 className="text-xl font-bold uppercase italic mb-6">Contribute <span className="text-wattvision-primary">Now</span></h3>
            
            {!paymentResult ? (
              <form onSubmit={handleDonate} className="space-y-6">
                <div>
                  <label className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mb-2 block">Donation Amount (IDR)</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-wattvision-textSecondary" size={18} />
                    <input 
                      type="number" 
                      className="w-full bg-wattvision-bg border border-wattvision-border pl-12 pr-4 py-4 rounded-2xl text-lg font-mono focus:outline-none focus:border-wattvision-primary transition-all"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-wattvision-primary text-black py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
                >
                  Generate QRIS Payment
                </button>
              </form>
            ) : (
              <div className="text-center space-y-6 animate-in fade-in zoom-in-95">
                <div className="p-6 bg-white rounded-3xl inline-block shadow-xl">
                  {/* In sandbox, we just show a placeholder QR. In production, this would be the actual provider image */}
                  <div className="w-48 h-48 bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-center p-4 text-xs uppercase tracking-tighter">
                    QRIS SANDBOX CODE<br/>{paymentResult.paymentData.paymentReference}
                  </div>
                </div>
                <div>
                  <p className="text-wattvision-textSecondary text-xs uppercase tracking-widest mb-1">Payment Reference</p>
                  <p className="text-sm font-mono font-bold">{paymentResult.paymentData.paymentReference}</p>
                </div>
                <div className="p-4 bg-wattvision-bg border border-wattvision-border rounded-2xl flex items-center gap-3 text-left">
                  <Info size={18} className="text-wattvision-primary shrink-0" />
                  <p className="text-[11px] text-wattvision-textSecondary leading-relaxed">
                    Please scan the QR code using any banking app. Your donation will be confirmed automatically once the payment is processed.
                  </p>
                </div>
                <button 
                  onClick={() => setPaymentResult(null)}
                  className="text-wattvision-textSecondary text-xs uppercase tracking-widest hover:text-white transition-colors"
                >
                  Cancel and Go Back
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;