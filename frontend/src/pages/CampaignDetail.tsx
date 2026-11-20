import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Clock, Heart, Info, QrCode, Copy, Check } from 'lucide-react';
import apiClient from '../utils/api';
import { formatIDR, formatDateTime } from '../utils/format';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { ON_CHAIN_NOTE } from '../components/ui/badgeStatus';

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

const PRESET_AMOUNTS = [50000, 100000, 250000, 500000];

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
  const [copiedSession, setCopiedSession] = useState(false);

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
          ? 'Silakan masuk terlebih dahulu untuk berdonasi.'
          : 'Gagal membuat pembayaran. Periksa koneksi dan coba lagi.'
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
      <div className="min-h-screen bg-[#F6F8F8] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <ErrorState
            message="Gagal memuat detail kampanye. Periksa koneksi ke server."
            retry={() => query.refetch()}
          />
        </div>
      </div>
    );
  }

  if (query.isPending) {
    return (
      <div className="min-h-screen bg-[#F6F8F8] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton lines={2} className="w-48 rounded-full" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <Card className="rounded-2xl p-6">
                <Skeleton lines={8} className="w-full rounded-xl" />
              </Card>
              <Card className="rounded-2xl p-6">
                <Skeleton lines={6} className="w-full rounded-xl" />
              </Card>
            </div>
            <div className="lg:col-span-5">
              <Card className="rounded-2xl p-6">
                <Skeleton lines={10} className="w-full rounded-xl" />
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const campaign = query.data;
  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#F6F8F8] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="rounded-2xl p-8">
            <EmptyState
              icon={<Heart size={40} className="text-primary" />}
              title="Kampanye tidak ditemukan"
              description="Kampanye mungkin telah dihapus atau tautan tidak valid."
              action={
                <Button onClick={() => navigate('/campaigns')}>
                  Lihat semua kampanye
                </Button>
              }
            />
          </Card>
        </div>
      </div>
    );
  }

  const target = Number(campaign.target_amount) || 0;
  const confirmed = Number(campaign.total_confirmed) || 0;
  const progress = target > 0 ? Math.min(100, (confirmed / target) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F6F8F8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Tombol Navigasi Kembali */}
        <div>
          <button
            type="button"
            onClick={() => navigate('/campaigns')}
            className="inline-flex items-center min-h-[44px] gap-2 text-xs sm:text-sm font-bold text-primary-dark/70 hover:text-primary-dark outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full px-3 py-1.5 transition-colors"
          >
            <ArrowLeft size={16} /> Kembali ke daftar kampanye
          </button>
        </div>

        {/* Layout 2 Kolom: Kiri (Deskripsi & Riwayat), Kanan (Sticky Progress & Donasi) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom Kiri: Deskripsi & Riwayat Donasi */}
          <div className="lg:col-span-7 space-y-6">
            {/* Kartu Deskripsi Kampanye */}
            <Card className="rounded-2xl p-6 sm:p-8 bg-white border border-slate-200/70 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl bg-primary-bg flex items-center justify-center text-primary shrink-0">
                  <Heart size={20} />
                </span>
                <Badge tone={campaign.status === 'ACTIVE' ? 'success' : 'neutral'}>
                  {campaign.status === 'ACTIVE' ? 'Aktif' : campaign.status}
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-dark mb-4 leading-tight">
                {campaign.title}
              </h1>

              <div className="text-primary-dark/80 text-sm sm:text-base leading-relaxed space-y-4">
                <p className="whitespace-pre-line">
                  {campaign.description || 'Program penggalangan zakat dan infaq terverifikasi untuk membantu mustahik yang membutuhkan.'}
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="bg-cream rounded-xl p-3 text-xs text-primary-dark/70 border border-cream">
                  {ON_CHAIN_NOTE}
                </div>
              </div>
            </Card>

            {/* Kartu Riwayat Donasi */}
            <Card className="rounded-2xl p-6 sm:p-8 bg-white border border-slate-200/70 shadow-card">
              <div className="flex items-center justify-between gap-2 mb-6">
                <h2 className="text-base sm:text-lg font-extrabold text-primary-dark flex items-center gap-2">
                  <Clock size={18} className="text-primary" /> Riwayat Donasi ({campaign.donations.length})
                </h2>
                <span className="text-xs text-primary-dark/60 font-medium">Tercatat di sistem</span>
              </div>

              {campaign.donations.length === 0 ? (
                <EmptyState
                  icon={<Heart size={32} className="text-primary" />}
                  title="Belum ada donasi terkonfirmasi"
                  description="Jadilah donatur pertama yang mendukung program penyaluran ini."
                />
              ) : (
                <div className="divide-y divide-dashed divide-primary-bg">
                  {campaign.donations.map((d) => (
                    <div
                      key={d.id}
                      className="py-3.5 flex flex-wrap justify-between items-center gap-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Badge tone={DONATION_TONE[d.status] ?? 'sky'}>
                          {DONATION_LABEL[d.status] ?? d.status}
                        </Badge>
                        <span className="text-xs text-primary-dark/60 font-medium">
                          {formatDateTime(d.timestamp)}
                        </span>
                      </div>
                      <span className="font-extrabold text-primary-dark tabular-nums text-sm sm:text-base">
                        {formatIDR(Number(d.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Kolom Kanan: Lengket (Sticky) Progress Capaian & Aksi Donasi */}
          <div className="lg:col-span-5">
            <Card className="rounded-2xl p-6 sm:p-8 bg-white border border-slate-200/70 shadow-card lg:sticky lg:top-8">
              <h2 className="text-lg font-extrabold text-primary-dark mb-4">
                Salurkan Donasi
              </h2>

              {/* Progress Bar & Nominal */}
              <div className="mb-6 space-y-2.5">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-xl font-extrabold text-primary-dark tabular-nums">
                    {formatIDR(confirmed)}
                  </span>
                  <span className="text-xs text-primary-dark/60 font-medium">
                    Target {formatIDR(target)}
                  </span>
                </div>

                <div className="h-2.5 rounded-full bg-primary-bg overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-primary-dark/70 font-medium">
                  <span>Tercapai {progress.toFixed(1)}%</span>
                  <span>{campaign.donation_count || campaign.donations.length} donasi tercatat</span>
                </div>
              </div>

              {/* Formulir Input Donasi & Generate QRIS */}
              {!paymentResult ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setPaymentError('');
                    paymentMutation.mutate();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold mb-2">
                      Pilih Nominal Cepat
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESET_AMOUNTS.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAmount(String(val))}
                          className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                            amount === String(val)
                              ? 'bg-primary text-white border-primary shadow-teal-glow'
                              : 'bg-primary-bg/50 border-primary-bg text-primary-dark hover:bg-primary-bg'
                          }`}
                        >
                          {formatIDR(val)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold mb-1.5">
                      Nominal Donasi Lainnya (Rp)
                    </label>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      required
                      className="w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-3 text-base text-primary-dark font-medium placeholder-primary-dark/40 outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Masukkan nominal bebas"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>

                  {paymentError && (
                    <p
                      role="alert"
                      className="rounded-xl border border-coral/40 bg-coral/10 p-3 text-xs sm:text-sm text-coral-dark font-medium"
                    >
                      {paymentError}
                    </p>
                  )}

                  {/* Aksi Utama Tunggal: Donasi / Generate QRIS */}
                  <button
                    type="submit"
                    disabled={paymentMutation.isPending || !amount || Number(amount) <= 0}
                    className="w-full inline-flex items-center justify-center min-h-[44px] rounded-full bg-gradient-to-br from-gold to-gold-light text-primary-dark font-bold text-sm shadow-gold-glow outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <QrCode size={16} className="mr-2" />
                    {paymentMutation.isPending ? 'Menyiapkan Pembayaran...' : 'Donasi Sekarang via QRIS'}
                  </button>
                </form>
              ) : (
                /* Tampilan Kode Pembayaran QRIS */
                <div className="space-y-5 text-center">
                  <div className="p-4 bg-primary-bg/30 rounded-2xl inline-block border border-primary-bg shadow-sm">
                    <div className="w-52 h-52 bg-white rounded-xl flex items-center justify-center text-primary-dark font-mono text-xs break-all p-4 border border-slate-200/80">
                      {paymentResult.paymentData.qris_url}
                    </div>
                  </div>

                  <div className="bg-cream rounded-xl p-3 border border-cream text-left">
                    <p className="text-[11px] uppercase tracking-wider text-primary-dark/60 font-semibold mb-0.5">
                      ID Sesi Pembayaran
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-primary-dark truncate">
                        {paymentResult.paymentData.session_id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(paymentResult.paymentData.session_id)}
                        className="p-1 rounded text-primary-dark/70 hover:bg-white text-xs inline-flex items-center gap-1 shrink-0"
                        title="Salin ID Sesi"
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

                  <div className="p-3.5 bg-primary-bg/50 rounded-xl flex items-start gap-2.5 text-left text-xs text-primary-dark/80">
                    <Info size={16} className="text-primary shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Pindai kode pembayaran dengan aplikasi m-banking atau e-wallet. Donasi berstatus tercatat setelah pembayaran diverifikasi oleh sistem.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentResult(null);
                      setAmount('');
                    }}
                    className="text-xs font-semibold text-primary-dark/70 hover:text-primary-dark hover:underline py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full px-4 min-h-[44px]"
                  >
                    Batal dan buat donasi baru
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
