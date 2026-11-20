import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Heart, Plus, X, Megaphone, Filter } from 'lucide-react';
import apiClient from '../utils/api';
import { formatIDR, formatDateKey } from '../utils/format';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../components/ui';
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

/** Dihitung sekali di level modul agar tidak ada pemanggilan Date saat render. */
const TODAY = new Date().toISOString().slice(0, 10);
const NOW_MS = Date.now();

const daysLeft = (deadline: string | null): number | null => {
  if (!deadline) return null;
  const diff = Date.parse(deadline) - NOW_MS;
  if (Number.isNaN(diff)) return null;
  return Math.ceil(diff / 86400000);
};

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
  const [filterStatus, setFilterStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', target_amount: '', deadline: '' });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
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
  const statusOptions = Array.from(new Set(campaigns.map((c) => c.status)));
  const visibleCampaigns = filterStatus
    ? campaigns.filter((c) => c.status === filterStatus)
    : campaigns;

  const handleDonate = (campaignId: number) => {
    setSelectedCampaignId(campaignId);
    setIsDrawerOpen(true);
  };

  if (query.isError) {
    return (
      <div className="min-h-screen bg-[#F6F8F8] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            message="Gagal memuat daftar kampanye. Periksa koneksi ke server."
            retry={() => query.refetch()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8F8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Katalog Kampanye */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-primary-dark">
              Kampanye Penggalangan
            </h1>
            <p className="text-sm text-primary-dark/70 mt-1">
              Pilih kampanye terpercaya dan salurkan donasi Anda secara transparan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-sm">
              <Filter size={16} className="text-primary-dark/60" />
              <select
                aria-label="Filter status kampanye"
                className="bg-transparent text-xs sm:text-sm text-primary-dark font-medium outline-none cursor-pointer"
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
                variant="secondary"
                onClick={() => {
                  setFormError('');
                  setIsCreateOpen(true);
                }}
              >
                <Plus size={16} className="mr-1.5" /> Buat Kampanye
              </Button>
            )}
          </div>
        </header>

        {/* State Loading (Skeleton) */}
        {query.isPending ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="rounded-2xl p-6">
                <Skeleton lines={7} className="w-full rounded-xl" />
              </Card>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          /* State Kosong (EmptyState) */
          <Card className="rounded-2xl p-8">
            <EmptyState
              icon={<Megaphone size={40} className="text-primary" />}
              title="Belum ada kampanye"
              description="Kampanye penggalangan akan tampil di sini. Silakan kembali lagi nanti."
              action={
                <Button onClick={() => query.refetch()}>Muat ulang</Button>
              }
            />
          </Card>
        ) : visibleCampaigns.length === 0 ? (
          /* State Kosong Filter */
          <Card className="rounded-2xl p-8">
            <EmptyState
              title="Tidak ada kampanye yang cocok"
              description="Coba pilih status lain pada filter di atas."
              action={
                <Button onClick={() => setFilterStatus('')}>Reset filter</Button>
              }
            />
          </Card>
        ) : (
          /* Grid Kartu Kampanye */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleCampaigns.map((campaign) => {
              const remaining = daysLeft(campaign.deadline);
              const percent = progressPercent(campaign);

              return (
                <Card
                  key={campaign.id}
                  className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-card hover:shadow-teal-glow transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header Kartu: Ikon & Badge Status */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary-bg flex items-center justify-center text-primary shrink-0">
                        <Heart size={20} />
                      </div>
                      <Badge tone={STATUS_TONE[campaign.status] ?? 'neutral'}>
                        {campaign.status === 'ACTIVE' ? 'Aktif' : campaign.status}
                      </Badge>
                    </div>

                    {/* Judul & Deskripsi Kampanye */}
                    <button
                      type="button"
                      onClick={() => navigate(`/campaigns/${campaign.id}`)}
                      className="text-left font-extrabold text-lg text-primary-dark mb-2 line-clamp-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    >
                      {campaign.title}
                    </button>
                    <p className="text-xs sm:text-sm text-primary-dark/70 leading-relaxed mb-5 line-clamp-3">
                      {campaign.description || 'Penyaluran zakat dan infaq terverifikasi untuk kemaslahatan mustahik.'}
                    </p>
                  </div>

                  {/* Bagian Bawah: Progress Bar & Aksi Utama */}
                  <div className="space-y-4 pt-2">
                    {/* Progress Bar & Nominal */}
                    <div className="space-y-2">
                      <div className="h-2 rounded-full bg-primary-bg overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-primary-dark">
                          {formatIDR(Number(campaign.current_amount || 0))}
                        </span>
                        <span className="text-primary-dark/60 font-medium">
                          Target {formatIDR(Number(campaign.target_amount))}
                        </span>
                      </div>

                      {campaign.deadline && (
                        <p className="text-[11px] text-primary-dark/60">
                          {remaining === null
                            ? `Batas waktu: ${formatDateKey(campaign.deadline)}`
                            : remaining > 0
                              ? `Sisa ${remaining} hari lagi`
                              : 'Pendaftaran kampanye telah berakhir'}
                        </p>
                      )}
                    </div>

                    {/* Aksi Utama Tunggal: Donasi (membuka DonationDrawer) */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleDonate(campaign.id)}
                        className="w-full inline-flex items-center justify-center min-h-[44px] rounded-full bg-gradient-to-br from-gold to-gold-light text-primary-dark font-bold text-sm shadow-gold-glow outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform active:scale-95"
                      >
                        <Heart size={16} className="mr-2 text-primary-dark fill-primary-dark/20" />
                        Donasi Sekarang
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        className="w-full text-center text-xs font-semibold text-primary-dark/70 hover:text-primary-dark hover:underline py-1"
                      >
                        Lihat Detail Program &rarr;
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal Buat Kampanye (ADMIN / AMIL) */}
        {isCreateOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsCreateOpen(false);
            }}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate();
              }}
              className="w-full max-w-xl space-y-5 rounded-3xl bg-white p-6 sm:p-8 shadow-card border border-slate-200/80"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-primary-dark">Buat Kampanye</h2>
                  <p className="mt-1 text-xs sm:text-sm text-primary-dark/70">
                    Lengkapi informasi program penyaluran dan target penggalangan dana.
                  </p>
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
                <p role="alert" className="rounded-xl border border-coral/40 bg-coral/10 p-3 text-xs sm:text-sm text-coral-dark font-medium">
                  {formError}
                </p>
              )}

              <label className="block text-sm font-semibold text-primary-dark">
                Nama kampanye
                <input
                  required
                  maxLength={120}
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  className="mt-1.5 w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-2.5 text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20 placeholder-primary-dark/40"
                  placeholder="Contoh: Bantuan Pangan Ramadan"
                />
              </label>

              <label className="block text-sm font-semibold text-primary-dark">
                Deskripsi
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className="mt-1.5 w-full rounded-xl bg-cream border border-primary-bg px-4 py-3 text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20 placeholder-primary-dark/40"
                  placeholder="Jelaskan tujuan dan penerima manfaat kampanye"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-primary-dark">
                  Target dana (Rp)
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={form.target_amount}
                    onChange={(event) => setForm({ ...form, target_amount: event.target.value })}
                    className="mt-1.5 w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-2.5 text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20 placeholder-primary-dark/40"
                    placeholder="10000000"
                  />
                </label>
                <label className="block text-sm font-semibold text-primary-dark">
                  Batas waktu
                  <input
                    type="date"
                    min={TODAY}
                    value={form.deadline}
                    onChange={(event) => setForm({ ...form, deadline: event.target.value })}
                    className="mt-1.5 w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-2.5 text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" loading={createMutation.isPending}>
                  Simpan Kampanye
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Panel Geser Donasi (DonationDrawer) */}
        <DonationDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          initialCampaignId={selectedCampaignId}
        />
      </div>
    </div>
  );
};

export default Campaigns;
