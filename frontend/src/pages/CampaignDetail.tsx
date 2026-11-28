import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, Heart, LogIn, ShieldCheck } from 'lucide-react';
import apiClient from '../utils/api';
import { formatDateTime, formatIDR } from '../utils/format';
import { Badge, Button, Card, EmptyState, ErrorState, ON_CHAIN_NOTE, Skeleton, statusBadge } from '../components/ui';
import { UnifiedPaymentFlow } from '../components/payment/UnifiedPaymentFlow';
import { getStoredSessionUser } from '../components/layout/navConfig';

interface Donation {
  id: number;
  amount: number;
  status: string;
  timestamp: string;
}

interface CampaignDetailData {
  id: number;
  title: string;
  description: string | null;
  target_amount: number;
  status: string;
  deadline: string | null;
  total_confirmed: number;
  donation_count: number;
  donations: Donation[];
}

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [manageStatus, setManageStatus] = useState<'ACTIVE' | 'COMPLETED' | 'CLOSED' | ''>('');
  const [manageTarget, setManageTarget] = useState('');
  const [manageFeedback, setManageFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const sessionUser = getStoredSessionUser();
  const isAuthenticated = Boolean(sessionUser);
  const userRole = sessionUser?.role ?? '';
  const canManage = userRole === 'AMIL' || userRole === 'ADMIN';
  const canDonate = !isAuthenticated || userRole === 'USER';

  const query = useQuery<CampaignDetailData>({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const { data } = await apiClient.get<CampaignDetailData>(`/campaigns/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  const handlePaymentSuccess = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['campaign', String(id)] });
  }, [queryClient, id]);

  const updateCampaignMutation = useMutation({
    mutationFn: async (payload: { status?: string; target_amount?: number }) => {
      const { data } = await apiClient.patch(`/campaigns/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      setManageFeedback({ type: 'ok', text: 'Perubahan program berhasil disimpan.' });
      setManageTarget('');
      void queryClient.invalidateQueries({ queryKey: ['campaign', String(id)] });
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (err: unknown) => {
      const apiMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setManageFeedback({ type: 'err', text: apiMsg || 'Gagal memperbarui program.' });
    },
  });

  if (query.isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <ErrorState
          message="Gagal memuat rincian program. Periksa koneksi ke server."
          retry={() => void query.refetch()}
        />
      </div>
    );
  }

  if (query.isPending) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <Skeleton lines={2} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <Card><Skeleton lines={8} /></Card>
            <Card><Skeleton lines={6} /></Card>
          </div>
          <div className="lg:col-span-5">
            <Card><Skeleton lines={10} /></Card>
          </div>
        </div>
      </div>
    );
  }

  const campaign = query.data;
  if (!campaign) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Card>
          <EmptyState
            icon={<Heart size={24} />}
            title="Program tidak ditemukan"
            description="Program mungkin telah dihapus atau tautan tidak valid."
            action={<Button onClick={() => navigate('/campaigns')}>Lihat Semua Program</Button>}
          />
        </Card>
      </div>
    );
  }

  const target = Number(campaign.target_amount) || 0;
  const confirmed = Number(campaign.total_confirmed) || 0;
  const progress = target > 0 ? Math.min(100, (confirmed / target) * 100) : 0;
  const campBadge = statusBadge(campaign.status);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate('/campaigns')}
          className="inline-flex items-center min-h-[44px] gap-2 text-sm font-semibold text-slate-600 hover:text-forest-dark"
        >
          <ArrowLeft size={16} /> Kembali ke Daftar Program
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-mint text-primary flex items-center justify-center">
                <Heart size={18} />
              </div>
              <Badge tone={campBadge.tone}>{campBadge.label}</Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-dark leading-tight">
              {campaign.title}
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {campaign.description || 'Program penyaluran zakat dan infaq terverifikasi untuk membantu mustahik yang membutuhkan.'}
            </p>

            <div className="pt-4 border-t border-slate-100">
              <div className="bg-cream rounded-xl p-3.5 text-xs text-slate-600 border border-slate-200/70">
                {ON_CHAIN_NOTE}
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-bold text-forest-dark flex items-center gap-2">
                <Clock size={18} className="text-primary" /> Riwayat Donasi ({campaign.donations.length})
              </h2>
              <span className="text-xs text-slate-500">Tercatat di sistem</span>
            </div>

            {campaign.donations.length === 0 ? (
              <EmptyState
                icon={<Heart size={24} />}
                title="Belum ada donasi tercatat"
                description="Jadilah muzakki pertama yang menyalurkan amanah ke program ini."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {campaign.donations.map((d) => {
                  const st = statusBadge(d.status);
                  return (
                    <div key={d.id} className="py-3.5 flex flex-wrap justify-between items-center gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Badge tone={st.tone}>{st.label}</Badge>
                        <span className="text-xs text-slate-500">{formatDateTime(d.timestamp)}</span>
                      </div>
                      <span className="font-bold text-forest-dark tabular-nums">
                        {formatIDR(Number(d.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
          {canManage && (
            <Card className="space-y-4 border border-primary/25 bg-white">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-forest-dark">Kelola Program (Amil / Admin)</h2>
                <Badge tone={campBadge.tone}>{campBadge.label}</Badge>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setManageFeedback(null);
                  const payload: { status?: string; target_amount?: number } = {};
                  if (manageStatus && manageStatus !== campaign.status) payload.status = manageStatus;
                  if (manageTarget.trim()) payload.target_amount = Number(manageTarget);
                  if (!payload.status && payload.target_amount === undefined) {
                    setManageFeedback({ type: 'err', text: 'Pilih status baru atau isi target nominal baru.' });
                    return;
                  }
                  updateCampaignMutation.mutate(payload);
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label htmlFor="camp-status" className="block font-semibold text-slate-600 mb-1">
                    Status Program
                  </label>
                  <select
                    id="camp-status"
                    value={manageStatus || campaign.status}
                    onChange={(e) => setManageStatus(e.target.value as 'ACTIVE' | 'COMPLETED' | 'CLOSED')}
                    className="w-full min-h-[40px] rounded-[10px] border border-slate-300 bg-white px-3 text-forest-dark font-medium"
                  >
                    <option value="ACTIVE">Aktif (Menerima Donasi)</option>
                    <option value="COMPLETED">Selesai (Target Terpenuhi)</option>
                    <option value="CLOSED">Ditutup</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="camp-target" className="block font-semibold text-slate-600 mb-1">
                    Ubah Target (Opsional, saat ini {formatIDR(target)})
                  </label>
                  <input
                    id="camp-target"
                    type="number"
                    min="1000"
                    step="1000"
                    value={manageTarget}
                    onChange={(e) => setManageTarget(e.target.value)}
                    placeholder={String(target)}
                    className="w-full min-h-[40px] rounded-[10px] border border-slate-300 bg-white px-3 text-forest-dark font-medium"
                  />
                </div>
                {manageFeedback && (
                  <p
                    role={manageFeedback.type === 'err' ? 'alert' : 'status'}
                    className={`rounded-xl border p-2.5 font-medium ${
                      manageFeedback.type === 'ok'
                        ? 'bg-mint border-primary/25 text-forest'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {manageFeedback.text}
                  </p>
                )}
                <Button type="submit" size="sm" loading={updateCampaignMutation.isPending} className="w-full">
                  Simpan Perubahan Program
                </Button>
              </form>
            </Card>
          )}

          <Card className="space-y-5">
            <h2 className="text-lg font-bold text-forest-dark">Salurkan Zakat ke Program Ini</h2>

            <div className="space-y-2.5">
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-xl font-extrabold text-forest-dark tabular-nums">{formatIDR(confirmed)}</span>
                <span className="text-xs text-slate-500">Target {formatIDR(target)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 tabular-nums">
                <span>Tercapai {progress.toFixed(1)}%</span>
                <span>{campaign.donation_count || campaign.donations.length} transaksi</span>
              </div>
            </div>

            {campaign.status !== 'ACTIVE' ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed">
                Program ini berstatus <strong>{campBadge.label}</strong> sehingga saat ini tidak menerima donasi baru.
              </div>
            ) : !isAuthenticated ? (
              <div className="rounded-xl border border-slate-200 bg-cream p-4 space-y-3">
                <p className="text-sm text-slate-700 leading-relaxed">
                  Masuk atau daftar akun Muzakki terlebih dahulu agar pembayaran Anda tercatat di riwayat donasi pribadi.
                </p>
                <Link
                  to="/login"
                  onClick={() => sessionStorage.setItem('zakat_redirect', `/campaigns/${id}`)}
                  className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-forest"
                >
                  <LogIn size={16} /> Masuk untuk Berdonasi
                </Link>
              </div>
            ) : !canDonate ? (
              <div className="rounded-xl border border-primary/20 bg-mint/50 p-4 text-xs text-forest flex items-start gap-2 leading-relaxed">
                <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
                <span>
                  Anda masuk sebagai akun operasional staf. Transaksi donasi Muzakki hanya dibuka melalui akun peran Muzakki.
                </span>
              </div>
            ) : (
              <UnifiedPaymentFlow
                initialCampaignId={String(campaign.id)}
                lockCampaign
                compact
                onSuccess={handlePaymentSuccess}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
