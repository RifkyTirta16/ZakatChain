import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, Plus, X } from 'lucide-react';
import apiClient from '../utils/api';

const COLORS = {
  primary: 'from-wattvision-primary to-cyan-400',
  secondary: 'from-wattvision-success to-emerald-400',
  alert: 'from-wattvision-alert to-rose-400',
  neutral: 'from-gray-800 to-gray-600',
};

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', target_amount: '', deadline: '' });
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('zakat_user') || 'null');
  const canCreateCampaign = ['ADMIN', 'AMIL'].includes(user?.role);

  const fetchCampaigns = async () => {
    try {
      const response = await apiClient.get('/campaigns');
      setCampaigns(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch campaigns', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchCampaigns(); }, []);

  const handleCreateCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      await apiClient.post('/campaigns', {
        title: form.title.trim(),
        description: form.description.trim(),
        target_amount: Number(form.target_amount),
        deadline: form.deadline || null,
      });
      setForm({ title: '', description: '', target_amount: '', deadline: '' });
      setIsCreateOpen(false);
      setLoading(true);
      await fetchCampaigns();
    } catch (error: any) {
      setFormError(error.response?.data?.error || 'Campaign gagal dibuat. Periksa koneksi dan hak akses akun Anda.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-wattvision-bg flex items-center justify-center text-wattvision-primary font-mono animate-pulse">Loading Campaigns...</div>;

  return (
    <div className="min-h-screen bg-wattvision-bg antialiased text-wattvision-textMain font-sans">
      {/* Gradient background overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-5" 
          style={{ background: 'radial-gradient(circle at 30% 20%, #00E5FF 0%, #121212 50%)' }} />
        <div className="absolute bottom-0 right-0 opacity-5" 
          style={{ background: 'radial-gradient(circle at 70% 80%, #32D74B 0%, #121212 50%)' }} />
      </div>

      <header className="flex justify-between items-center mb-12 px-4 md:px-6">
        <div>
          <h1 className="text-4xl font-bold uppercase italic tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-wattvision-primary to-cyan-400">
            Zakat <span className="text-wattvision-primary">Campaigns</span>
          </h1>
          <p className="text-wattvision-textSecondary uppercase tracking-widest text-xs font-medium mt-1">Direct Impact Fundraising Registry</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setFormError(''); setIsCreateOpen(true); }}
            disabled={!canCreateCampaign}
            title={!canCreateCampaign ? 'Hanya ADMIN atau AMIL yang dapat membuat campaign' : undefined}
            className="bg-gradient-to-r from-wattvision-primary to-cyan-400 text-black px-5 py-2 rounded-full font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm shadow-cyan-500/20"
          >
            <Plus size={16} /> Create Campaign
          </button>
        </div>
      </header>

      {!canCreateCampaign && <p className="mt-2 mb-8 text-xs text-wattvision-textSecondary text-center">Pembuatan campaign hanya tersedia untuk akun ADMIN atau AMIL.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-6 max-w-7xl mx-auto">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="group bg-wattvision-surface border border-wattvision-border rounded-2xl shadow-sm hover:border-primary/30 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-wattvision-primary group-hover:bg-wattvision-primary/20 group-hover:text-wattvision-primary transition-all">
                <Heart size={24} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-widest ${campaign.status === 'ACTIVE' ? 'bg-wattvision-success/20 text-wattvision-success' : 'bg-gray-700 text-gray-400'}">
                {campaign.status}
              </span>
            </div>
            
            <h3 className="text-xl font-bold uppercase italic mb-2 line-clamp-2">{campaign.title}</h3>
            <p className="text-wattvision-textSecondary text-sm leading-relaxed mb-4 line-clamp-3">{campaign.description}</p>
            
            <div className="space-y-3 mb-5">
              <div className="flex justify-between items-end">
                <span className="text-wattvision-textSecondary text-xs uppercase tracking-widest">Progress</span>
                <span className="text-sm font-mono font-bold text-wattvision-primary">
                  {((Number(campaign.current_amount || 0) / Number(campaign.target_amount || 0)) * 100 || 0).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all" 
                  style={{ width: `${Math.min(100, (Number(campaign.current_amount || 0) / Number(campaign.target_amount || 0)) * 100 || 0)}%`, background: COLORS.secondary }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-wattvision-textSecondary">Rp {campaign.current_amount?.toLocaleString('id-ID')}</span>
                <span className="text-wattvision-textSecondary">Target: Rp {campaign.target_amount?.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <button 
              onClick={() => navigate(`/campaigns/${campaign.id}`)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-wattvision-primary to-cyan-400 text-black font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 group-hover:border-wattvision-primary"
            >
              View Details <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>

      {!campaigns.length && <div className="mt-8 rounded-2xl border border-wattvision-border bg-wattvision-surface p-10 text-center text-sm text-wattvision-textSecondary antialiased">Belum ada campaign. Buat campaign pertama untuk mulai menggalang dana.</div>}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCreateOpen(false); }}>
          <form onSubmit={handleCreateCampaign} className="w-full max-w-xl space-y-5 rounded-3xl border border-wattvision-border bg-white p-8 shadow-xl max-w-2xl mx-4 antialiased">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold uppercase italic">Create <span className="text-wattvision-primary">Campaign</span></h2>
                <p className="mt-1 text-xs text-wattvision-textSecondary">Isi informasi penggalangan dana baru.</p>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)} aria-label="Tutup form" className="rounded-lg p-2 text-wattvision-textSecondary hover:bg-wattvision-border hover:text-white transition-all"><X size={18} /></button>
            </div>

            {formError && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{formError}</p>}
            <label className="block text-xs uppercase tracking-widest text-wattvision-textSecondary">Nama campaign
              <input required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-500 bg-gray-900 px-4 py-3 text-sm normal-case tracking-normal text-gray-200 outline-none focus:ring-2 focus:ring-wattvision-primary focus:border-wattvision-primary" placeholder="Contoh: Bantuan Pangan Ramadan" />
            </label>
            <label className="block text-xs uppercase tracking-widest text-wattvision-textSecondary">Deskripsi
              <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 w-full resize-y rounded-xl border border-gray-500 bg-gray-900 px-4 py-3 text-sm normal-case tracking-normal text-gray-200 outline-none focus:ring-2 focus:ring-wattvision-primary" placeholder="Jelaskan tujuan dan penerima manfaat campaign" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs uppercase tracking-widest text-wattvision-textSecondary">Target dana (Rp)
                <input required type="number" min="1" step="1" value={form.target_amount} onChange={(event) => setForm({ ...form, target_amount: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-500 bg-gray-900 px-4 py-3 font-mono text-sm text-gray-200 outline-none focus:ring-2 focus:ring-wattvision-primary" placeholder="10000000" />
              </label>
              <label className="block text-xs uppercase tracking-widest text-wattvision-textSecondary">Batas waktu
                <input type="date" min={new Date().toISOString().slice(0, 10)} value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-500 bg-gray-900 px-4 py-3 text-sm text-gray-200 outline-none focus:ring-2 focus:ring-wattvision-primary" />
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-xl border border-gray-500 bg-gray-900 px-5 py-3 text-xs font-bold uppercase tracking-widest text-gray-300 hover:text-white transition-all">Batal</button>
              <button type="submit" disabled={isSaving} className="rounded-xl bg-gradient-to-r from-wattvision-primary to-cyan-400 px-5 py-3 text-xs font-bold uppercase tracking-widest text-black transition hover:opacity-90 disabled:opacity-50">Simpan Campaign</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Campaigns;