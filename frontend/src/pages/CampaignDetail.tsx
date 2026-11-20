import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Clock, Copy, Heart, Info, LogIn, QrCode } from 'lucide-react';
import apiClient from '../utils/api';
import { formatDateTime, formatIDR } from '../utils/format';
import { Badge, Button, Card, EmptyState, ErrorState, ON_CHAIN_NOTE, Skeleton } from '../components/ui';

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

const PRESET_AMOUNTS = [50_000, 100_000, 250_000, 500_000];

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

const DONATION_TONE: Record<string, 'success' | 'sky' | 'warning'> = {
  CONFIRMED: 'success',
  PENDING: 'warning',
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
  const [copiedSession, setCopiedSession] = useState(false);

  const isAuthenticated = Boolean(localStorage.getItem('zakat_token') && localStorage.getItem('zakat_user'));

  const query = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => fetchCampaignDetail(id as string),
    enabled: Boolean(id),
  });

  const paymentMutation = useMutation({
    mutationFn: () => generatePayment(id as string, amount),
    onSuccess: (data) => {
      setPaymentResult(data);
      setPaymentError('');
    },
    onError: (error: unknown) => {
      const e = error as { response?: { status?: number } };
      setPaymentError(
        e.response?.status === 401
          ? 'Silakan masuk terlebih dahulu untuk menunaikan zakat.'
          : 'Gagal membuat sesi pembayaran. Periksa koneksi dan coba lagi.',
      );
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSession(true);
    setTimeout(() => setCopiedSession(false), 2000);
  };

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
              <Badge tone={campaign.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {campaign.status === 'ACTIVE' ? 'Aktif' : campaign.status}
              </Badge>
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
                {campaign.donations.map((d) => (
                  <div key={d.id} className="py-3.5 flex flex-wrap justify-between items-center gap-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Badge tone={DONATION_TONE[d.status] ?? 'neutral'}>
                        {DONATION_LABEL[d.status] ?? d.status}
                      </Badge>
                      <span className="text-xs text-slate-500">{formatDateTime(d.timestamp)}</span>
                    </div>
                    <span className="font-bold text-forest-dark tabular-nums">
                      {formatIDR(Number(d.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card className="lg:sticky lg:top-24 space-y-5">
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

            {!isAuthenticated ? (
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
            ) : !paymentResult ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPaymentError('');
                  paymentMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slateText font-bold mb-2">
                    Pilih Nominal Cepat (IDR)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_AMOUNTS.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmount(String(val))}
                        className={`min-h-[40px] px-3 py-2 rounded-[10px] text-xs font-semibold border transition-colors ${
                          amount === String(val)
                            ? 'bg-primary text-white border-primary'
                            : 'bg-cream border-slate-200 text-forest-dark hover:bg-mint'
                        }`}
                      >
                        {formatIDR(val)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="campaign-amount"
                    className="block text-xs uppercase tracking-wider text-slateText font-bold mb-1.5"
                  >
                    Nominal Zakat Lainnya (IDR)
                  </label>
                  <input
                    id="campaign-amount"
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    className="w-full min-h-[44px] rounded-[10px] bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-forest-dark font-medium outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    placeholder="Masukkan nominal dalam Rupiah"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                {paymentError && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs sm:text-sm text-red-800 font-medium">
                    {paymentError}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="gold"
                  loading={paymentMutation.isPending}
                  disabled={!amount || Number(amount) <= 0}
                  className="w-full"
                >
                  <QrCode size={16} /> Buat Sesi Pembayaran QRIS
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-cream rounded-2xl inline-block border border-slate-200">
                  <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center text-forest-dark font-mono text-xs break-all p-4 border border-slate-200">
                    {paymentResult.paymentData.qris_url}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-left">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    ID Sesi Pembayaran
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-forest-dark truncate">
                      {paymentResult.paymentData.session_id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(paymentResult.paymentData.session_id)}
                      className="p-1 rounded text-slate-600 hover:bg-white text-xs inline-flex items-center gap-1 shrink-0"
                    >
                      {copiedSession ? (
                        <span className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                          <Check size={12} /> Tersalin
                        </span>
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-mint rounded-xl flex items-start gap-2.5 text-left text-xs text-forest border border-primary/20">
                  <Info size={16} className="text-primary shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Pindai kode pembayaran QRIS Sandbox dengan aplikasi e-wallet/m-banking. Status donasi berubah setelah konfirmasi sistem pembayaran.
                  </p>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setPaymentResult(null);
                    setAmount('');
                  }}
                  className="w-full"
                >
                  Buat Pembayaran Baru
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
