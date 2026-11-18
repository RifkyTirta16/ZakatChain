import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Clock, Heart, Info, QrCode } from 'lucide-react';
import apiClient from '../utils/api';
import { formatIDR, formatDateTime } from '../utils/format';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../components/ui';

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

interface PaymentSession {
  paymentData: {
    session_id: string;
    qris_url: string;
  };
}

const fetchCampaignDetail = async (id: string): Promise<CampaignDetailData> => {
  const { data } = await apiClient.get(`/campaigns/${id}`);
  return data;
};

const generatePayment = async (id: string, amount: string): Promise<PaymentSession> => {
  const { data } = await apiClient.post('/payment/generate', {
    campaign_id: id,
    amount: parseFloat(amount),
  });
  return data;
};

const DONATION_TONE: Record<string, 'success' | 'sky' | 'coral'> = {
  CONFIRMED: 'success',
  PENDING: 'sky',
};

const DONATION_LABEL: Record<string, string> = {
  CONFIRMED: 'Terkonfirmasi',
  PENDING: 'Menunggu',
};

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [paymentResult, setPaymentResult] = useState<PaymentSession | null>(null);
  const [paymentError, setPaymentError] = useState('');

  const query = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => fetchCampaignDetail(id as string),
    enabled: Boolean(id),
  });

  const paymentMutation = useMutation({
    mutationFn: () => generatePayment(id as string, amount),
    onSuccess: (data) => setPaymentResult(data),
    onError: (error: unknown) => {
      const e = error as { response?: { status?: number } };
      setPaymentError(
        e.response?.status === 401
          ? 'Silakan masuk terlebih dahulu untuk berdonasi.'
          : 'Gagal membuat pembayaran. Periksa koneksi dan coba lagi.'
      );
    },
  });

  if (query.isError) {
    return (
      <div className="max-w-3xl mx-auto">
        <ErrorState
          message="Gagal memuat detail kampanye. Periksa koneksi ke server."
          retry={() => query.refetch()}
        />
      </div>
    );
  }

  if (query.isPending) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <Skeleton lines={8} className="w-full rounded-xl" />
        </Card>
      </div>
    );
  }

  const campaign = query.data;
  if (!campaign) {
    return (
      <Card>
        <EmptyState
          icon={<Heart size={40} className="text-primary" />}
          title="Kampanye tidak ditemukan"
          description="Kampanye mungkin telah dihapus atau tautan tidak valid."
          action={<Button onClick={() => navigate('/campaigns')}>Lihat semua kampanye</Button>}
        />
      </Card>
    );
  }

  const target = Number(campaign.target_amount) || 0;
  const progress = target > 0 ? Math.min(100, ((Number(campaign.total_confirmed) || 0) / target) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center min-h-[44px] gap-2 text-sm font-bold text-primary-dark/70 hover:text-primary-dark outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full px-3"
      >
        <ArrowLeft size={14} /> Kembali ke kampanye
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-2xl font-extrabold text-primary-dark">{campaign.title}</h1>
              <Badge tone={campaign.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {campaign.status === 'ACTIVE' ? 'Aktif' : campaign.status}
              </Badge>
            </div>
            <p className="text-primary-dark/70 leading-relaxed mb-6">
              {campaign.description || 'Tanpa deskripsi.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-cream rounded-xl">
                <p className="text-xs text-primary-dark/70 mb-1">Target</p>
                <p className="text-base font-extrabold text-primary-dark">{formatIDR(target)}</p>
              </div>
              <div className="p-4 bg-cream rounded-xl">
                <p className="text-xs text-primary-dark/70 mb-1">Terkonfirmasi</p>
                <p className="text-base font-extrabold text-primary-dark">
                  {formatIDR(Number(campaign.total_confirmed))}
                </p>
              </div>
              <div className="p-4 bg-cream rounded-xl">
                <p className="text-xs text-primary-dark/70 mb-1">Progress</p>
                <p className="text-base font-extrabold text-primary-dark">{progress.toFixed(1)}%</p>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-primary-bg overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-bold text-primary-dark mb-4 flex items-center gap-2">
              <Clock size={16} className="text-primary" /> Riwayat donasi
            </h2>
            {campaign.donations.length === 0 ? (
              <EmptyState
                icon={<Heart size={32} className="text-primary" />}
                title="Belum ada donasi terkonfirmasi"
                description="Jadilah yang pertama mendukung kampanye ini."
              />
            ) : (
              <div className="space-y-3">
                {campaign.donations.map((d) => (
                  <div
                    key={d.id}
                    className="flex justify-between items-center p-4 bg-cream rounded-xl text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Badge tone={DONATION_TONE[d.status] ?? 'sky'}>
                        {DONATION_LABEL[d.status] ?? d.status}
                      </Badge>
                      <span className="text-xs text-primary-dark/70">{formatDateTime(d.timestamp)}</span>
                    </div>
                    <span className="font-bold text-primary-dark">{formatIDR(Number(d.amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-24">
            <h2 className="text-lg font-extrabold text-primary-dark mb-4">Donasi Sekarang</h2>

            {!paymentResult ? (
              <form
                onSubmit={(e) => { e.preventDefault(); setPaymentError(''); paymentMutation.mutate(); }}
                className="space-y-4"
              >
                <label className="block text-sm font-medium text-primary-dark">
                  Nominal donasi (Rp)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    className="mt-2 w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-3 text-base text-primary-dark placeholder-primary-dark/50 outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>
                {paymentError && (
                  <p role="alert" className="rounded-xl border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
                    {paymentError}
                  </p>
                )}
                <Button type="submit" className="w-full" loading={paymentMutation.isPending}>
                  <QrCode size={16} className="mr-2" /> Generate QRIS Payment
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-6 bg-white rounded-2xl inline-block shadow-card">
                  <div className="w-48 h-48 bg-cream rounded-lg flex items-center justify-center text-primary-dark/70 font-bold text-center p-4 text-xs break-all">
                    {paymentResult.paymentData.qris_url}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-primary-dark/70 mb-1">Referensi pembayaran</p>
                  <p className="text-sm font-bold text-primary-dark">
                    {paymentResult.paymentData.session_id}
                  </p>
                </div>
                <div className="p-4 bg-cream rounded-xl flex items-center gap-3 text-left">
                  <Info size={18} className="text-primary shrink-0" />
                  <p className="text-xs text-primary-dark/70 leading-relaxed">
                    Pindai kode pembayaran dengan aplikasi perbankan apa pun. Donasi Anda akan
                    terkonfirmasi otomatis setelah pembayaran diproses.
                  </p>
                </div>
                <button
                  onClick={() => setPaymentResult(null)}
                  className="text-sm font-medium text-primary-dark/70 hover:text-primary-dark outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full px-3 min-h-[44px]"
                >
                  Batalkan dan kembali
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
