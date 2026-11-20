import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Filter, Heart, Megaphone, Plus, X } from 'lucide-react';
import apiClient from '../utils/api';
import { formatDateKey, formatIDR } from '../utils/format';
import { Badge, Button, Card, EmptyState, ErrorState, SectionHeader, Skeleton } from '../components/ui';
import DonationDrawer from '../components/dashboard/DonationDrawer';

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

const TODAY = new Date().toISOString().slice(0, 10);
const NOW_MS = Date.now();

const daysLeft = (deadline: string | null): number | null => {
  if (!deadline) return null;
  const diff = Date.parse(deadline) - NOW_MS;
  if (Number.isNaN(diff)) return null;
  return Math.ceil(diff / 86400000);
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
  const [filterStatus, setFilterStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', target_amount: '', deadline: '' });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const navigate = useNavigate();

  const storedUser = localStorage.getItem('zakat_user');
  const token = localStorage.getItem('zakat_token');
  let user: SessionUser | null = null;
  try {
    user = storedUser ? (JSON.parse(storedUser) as SessionUser) : null;
  } catch {
    user = null;
  }
  const canCreateCampaign = ['ADMIN', 'AMIL'].includes(user?.role ?? '');
  const canDonateAsMuzakki = !user || user.role === 'USER';

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
      setFormError(e.response?.data?.error || 'Program gagal dibuat. Periksa koneksi dan hak akses akun Anda.');
    },
  });

  const campaigns = query.data ?? [];
  const statusOptions = Array.from(new Set(campaigns.map((c) => c.status)));
  const visibleCampaigns = filterStatus
    ? campaigns.filter((c) => c.status === filterStatus)
    : campaigns;

  const handleDonate = (campaignId: number) => {
    if (!user || !token) {
      sessionStorage.setItem('zakat_redirect', `/campaigns/${campaignId}`);
      navigate('/login');
      return;
    }
    setSelectedCampaignId(campaignId);
    setIsDrawerOpen(true);
  };

  if (query.isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ErrorState
          message="Gagal memuat daftar program zakat. Periksa koneksi ke server."
          retry={() => void query.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <SectionHeader
          title="Program Penyaluran Zakat"
          subtitle="Pilih program penyaluran aktif yang terpantau dan tercatat hash auditnya secara transparan."
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 bg-white px-3.5 py-2 rounded-[10px] border border-slate-300">
            <Filter size={15} className="text-slate-500" />
            <select
              aria-label="Filter status program"
              className="bg-transparent text-xs sm:text-sm text-forest-dark font-medium outline-none cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Semua Status</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st === 'ACTIVE' ? 'Aktif' : st}
                </option>
              ))}
            </select>
          </div>

          {canCreateCampaign && (
            <Button
              variant="primary"
              onClick={() => {
                setFormError('');
                setIsCreateOpen(true);
              }}
            >
              <Plus size={16} /> Buat Program
            </Button>
          )}
        </div>
      </div>

      {query.isPending ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <Card key={n}>
              <Skeleton lines={7} />
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Megaphone size={24} />}
            title="Belum ada program penyaluran"
            description="Program zakat akan tampil di sini setelah dibuat oleh Amil atau Administrator."
            action={<Button onClick={() => void query.refetch()}>Muat Ulang</Button>}
          />
        </Card>
      ) : visibleCampaigns.length === 0 ? (
        <Card>
          <EmptyState
            title="Tidak ada program sesuai filter"
            description="Pilih status lain untuk melihat daftar program yang tersedia."
            action={<Button onClick={() => setFilterStatus('')}>Reset Filter</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleCampaigns.map((campaign) => {
            const remaining = daysLeft(campaign.deadline);
            const percent = progressPercent(campaign);

            return (
              <Card
                key={campaign.id}
                className="flex flex-col justify-between gap-5 hover:shadow-elevated transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-10 rounded-xl bg-mint text-primary flex items-center justify-center">
                      <Heart size={18} />
                    </div>
                    <Badge tone={campaign.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {campaign.status === 'ACTIVE' ? 'Aktif' : campaign.status}
                    </Badge>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                    className="text-left font-bold text-lg text-forest-dark line-clamp-2 hover:text-primary transition-colors"
                  >
                    {campaign.title}
                  </button>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {campaign.description || 'Penyaluran zakat dan infaq terverifikasi untuk kemaslahatan mustahik.'}
                  </p>
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="space-y-2">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-xs tabular-nums">
                      <span className="font-bold text-forest-dark">
                        {formatIDR(Number(campaign.current_amount || 0))}
                      </span>
                      <span className="text-slate-500">
                        Target {formatIDR(Number(campaign.target_amount))}
                      </span>
                    </div>
                    {campaign.deadline && (
                      <p className="text-[11px] text-slate-500">
                        {remaining === null
                          ? `Batas waktu: ${formatDateKey(campaign.deadline)}`
                          : remaining > 0
                            ? `Sisa ${remaining} hari lagi`
                            : 'Periode program telah berakhir'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    {canDonateAsMuzakki ? (
                      <>
                        <Button
                          variant="primary"
                          onClick={() => handleDonate(campaign.id)}
                          className="w-full"
                        >
                          <Heart size={15} /> Tunaikan Zakat ke Program
                        </Button>
                        <button
                          type="button"
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                          className="w-full text-center text-xs font-semibold text-slate-600 hover:text-primary py-1"
                        >
                          Lihat Rincian & Riwayat →
                        </button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        className="w-full"
                      >
                        Lihat Rincian & Penyaluran →
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-forest-dark/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsCreateOpen(false);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
            className="w-full max-w-xl space-y-5 rounded-2xl bg-white p-6 sm:p-8 shadow-elevated border border-slate-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-forest-dark">Buat Program Zakat</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-600">
                  Lengkapi informasi program penyaluran dan target penggalangan dana.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Tutup form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs sm:text-sm text-red-800 font-medium">
                {formError}
              </p>
            )}

            <label className="block text-xs font-semibold uppercase tracking-wider text-slateText">
              Nama Program
              <input
                required
                maxLength={120}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="mt-1.5 w-full min-h-[44px] rounded-[10px] bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary font-normal"
                placeholder="Contoh: Bantuan Pangan Ramadan"
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wider text-slateText">
              Deskripsi
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="mt-1.5 w-full rounded-[10px] bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary font-normal"
                placeholder="Jelaskan tujuan dan sasaran penyaluran"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slateText">
                Target Dana (IDR)
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={form.target_amount}
                  onChange={(event) => setForm({ ...form, target_amount: event.target.value })}
                  className="mt-1.5 w-full min-h-[44px] rounded-[10px] bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary font-normal"
                  placeholder="10000000"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slateText">
                Batas Waktu
                <input
                  type="date"
                  min={TODAY}
                  value={form.deadline}
                  onChange={(event) => setForm({ ...form, deadline: event.target.value })}
                  className="mt-1.5 w-full min-h-[44px] rounded-[10px] bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary font-normal"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Simpan Program
              </Button>
            </div>
          </form>
        </div>
      )}

      <DonationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialCampaignId={selectedCampaignId}
      />
    </div>
  );
};

export default Campaigns;
