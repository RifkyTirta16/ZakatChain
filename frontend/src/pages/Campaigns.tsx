import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowRight, Heart, Plus, X, Megaphone } from 'lucide-react';
import apiClient from '../utils/api';
import { formatIDR, formatDateKey } from '../utils/format';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../components/ui';

interface Campaign {
  id: number;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
}

interface SessionUser {
  id?: number;
  username?: string;
  role?: string;
}

/** Dihitung sekali di level modul agar tidak ada pemanggilan Date saat render. */
const TODAY = new Date().toISOString().slice(0, 10);

const STATUS_TONE: Record<string, 'success' | 'neutral'> = {
  ACTIVE: 'success',
};

const fetchCampaigns = async (): Promise<Campaign[]> => {
  const { data } = await apiClient.get('/campaigns');
  return Array.isArray(data) ? data : [];
};

const progressPercent = (campaign: Campaign): number => {
  const target = Number(campaign.target_amount) || 0;
  if (target <= 0) return 0;
  const current = Number(campaign.current_amount) || 0;
  return Math.min(100, (current / target) * 100);
};

const Campaigns = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', target_amount: '', deadline: '' });
  const navigate = useNavigate();

  const storedUser = localStorage.getItem('zakat_user');
  let user: SessionUser | null = null;
  try {
    user = storedUser ? (JSON.parse(storedUser) as SessionUser) : null;
  } catch {
    user = null;
  }
  const canCreateCampaign = ['ADMIN', 'AMIL'].includes(user?.role ?? '');

  const query = useQuery({
    queryKey: ['campaigns'],
    queryFn: fetchCampaigns,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/campaigns', {
        title: form.title.trim(),
        description: form.description.trim(),
        target_amount: Number(form.target_amount),
        deadline: form.deadline || null,
      });
    },
    onSuccess: () => {
      setForm({ title: '', description: '', target_amount: '', deadline: '' });
      setIsCreateOpen(false);
      void query.refetch();
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { error?: string } } };
      setFormError(e.response?.data?.error || 'Campaign gagal dibuat. Periksa koneksi dan hak akses akun Anda.');
    },
  });

  const campaigns = query.data ?? [];

  if (query.isError) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <ErrorState
          message="Gagal memuat daftar kampanye. Periksa koneksi ke server."
          retry={() => query.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-primary-dark">
            Kampanye Penggalangan
          </h1>
          <p className="text-sm text-primary-dark/70 mt-1">
            Pilih kampanye dan salurkan donasi Anda.
          </p>
        </div>
        {canCreateCampaign && (
          <Button onClick={() => { setFormError(''); setIsCreateOpen(true); }}>
            <Plus size={16} className="mr-2" /> Buat Kampanye
          </Button>
        )}
      </header>

      {query.isPending ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <Card key={n}>
              <Skeleton lines={6} className="w-full rounded-lg" />
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Megaphone size={40} className="text-primary" />}
            title="Belum ada kampanye"
            description="Kampanye penggalangan akan tampil di sini. Silakan kembali lagi nanti."
            action={
              <Button onClick={() => query.refetch()}>Muat ulang</Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-bg flex items-center justify-center text-primary">
                  <Heart size={20} />
                </div>
                <Badge tone={STATUS_TONE[campaign.status] ?? 'neutral'}>
                  {campaign.status === 'ACTIVE' ? 'Aktif' : campaign.status}
                </Badge>
              </div>

              <h2 className="text-lg font-extrabold text-primary-dark mb-1 line-clamp-2">
                {campaign.title}
              </h2>
              <p className="text-sm text-primary-dark/70 leading-relaxed mb-4 line-clamp-3">
                {campaign.description || 'Tanpa deskripsi.'}
              </p>

              <div className="mt-auto space-y-3">
                <div className="h-2 rounded-full bg-primary-bg overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${progressPercent(campaign)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-primary-dark">
                    {formatIDR(Number(campaign.current_amount))}
                  </span>
                  <span className="text-primary-dark/70">
                    Target {formatIDR(Number(campaign.target_amount))}
                  </span>
                </div>
                {campaign.deadline && (
                  <p className="text-xs text-primary-dark/70">
                    Batas waktu: {formatDateKey(campaign.deadline)}
                  </p>
                )}
                <button
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  className="w-full inline-flex items-center justify-center min-h-[44px] rounded-full bg-gradient-to-br from-gold to-gold-light text-primary-dark font-bold text-sm shadow-gold-glow outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform active:scale-95"
                >
                  Lihat Detail <ArrowRight size={14} className="ml-2" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCreateOpen(false); }}
        >
          <form
            onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}
            className="w-full max-w-xl space-y-5 rounded-3xl bg-white p-8 shadow-card"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-primary-dark">Buat Kampanye</h2>
                <p className="mt-1 text-sm text-primary-dark/70">Isi informasi penggalangan dana baru.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Tutup form"
                className="rounded-lg p-2 text-primary-dark/70 hover:bg-primary-bg outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <p role="alert" className="rounded-xl border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
                {formError}
              </p>
            )}

            <label className="block text-sm font-medium text-primary-dark">
              Nama kampanye
              <input
                required
                maxLength={120}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className=""
                placeholder="Contoh: Bantuan Pangan Ramadan"
              />
            </label>
            <label className="block text-sm font-medium text-primary-dark">
              Deskripsi
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="mt-2 w-full rounded-xl bg-cream border border-primary-bg px-4 py-3 text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Jelaskan tujuan dan penerima manfaat kampanye"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-primary-dark">
                Target dana (Rp)
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={form.target_amount}
                  onChange={(event) => setForm({ ...form, target_amount: event.target.value })}
                  className=""
                  placeholder="10000000"
                />
              </label>
              <label className="block text-sm font-medium text-primary-dark">
                Batas waktu
                <input
                  type="date"
                  min={TODAY}
                  value={form.deadline}
                  onChange={(event) => setForm({ ...form, deadline: event.target.value })}
                  className=""
                />
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Batal</Button>
              <Button type="submit" loading={createMutation.isPending}>Simpan Kampanye</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
