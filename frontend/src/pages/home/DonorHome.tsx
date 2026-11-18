import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HandHeart, Megaphone, ShieldCheck } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatIDR, formatDateTime } from '../../utils/format';
import { Badge, Card, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import type { SessionUser } from '../../components/layout/navConfig';

interface Donation {
  id: number;
  campaign_id: number | null;
  amount: number;
  status: string;
  timestamp: string;
}

const fetchDonorDonations = async (donorId: number): Promise<Donation[]> => {
  const { data } = await apiClient.get(`/donations/donor/${donorId}`);
  return data;
};

const DONATION_TONE: Record<string, 'success' | 'sky' | 'coral'> = {
  CONFIRMED: 'success',
  PENDING: 'sky',
};

const DonorHome = ({ user }: { user: SessionUser | null }) => {
  const donorId = user?.id;
  const query = useQuery({
    queryKey: ['donor-donations', donorId],
    queryFn: () => fetchDonorDonations(donorId as number),
    enabled: typeof donorId === 'number',
  });

  const donations = query.data ?? [];
  const confirmed = donations.filter((d) => d.status === 'CONFIRMED');
  const totalConfirmed = confirmed.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const recent = donations.slice(0, 5);

  if (query.isError) {
    return (
      <ErrorState
        message="Gagal memuat dampak donasi Anda. Periksa koneksi ke server."
        retry={() => query.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary-dark mb-1">Dampak donasi saya</h1>
        <p className="text-primary-dark/70">
          Halo {user?.username || 'Sahabat'}, terima kasih sudah berbagi.
        </p>
      </div>

      {query.isPending ? (
        <Skeleton lines={6} className="w-full rounded-xl" />
      ) : donations.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HandHeart size={40} className="text-primary" />}
            title="Belum ada donasi tercatat"
            description="Donasi Anda akan muncul di sini setelah pembayaran terkonfirmasi."
            action={
              <Link
                to="/campaigns"
                className="inline-flex items-center min-h-[44px] rounded-full px-6 border-2 border-primary text-primary-dark font-bold text-sm shadow-teal-glow"
              >
                <Megaphone size={16} className="mr-2" /> Lihat kampanye
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-primary-dark/70 mb-1">Total donasi terkonfirmasi</p>
              <p className="text-xl font-extrabold text-primary-dark">{formatIDR(totalConfirmed)}</p>
            </Card>
            <Card>
              <p className="text-sm text-primary-dark/70 mb-1">Donasi terkonfirmasi</p>
              <p className="text-xl font-extrabold text-primary-dark">{confirmed.length} donasi</p>
            </Card>
            <Card>
              <p className="text-sm text-primary-dark/70 mb-1">Menunggu konfirmasi</p>
              <p className="text-xl font-extrabold text-primary-dark">
                {donations.length - confirmed.length} donasi
              </p>
            </Card>
          </div>

          <Card>
            <h2 className="font-bold text-primary-dark mb-3">Riwayat donasi terakhir</h2>
            <div className="divide-y divide-dashed">
              {recent.map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between gap-2 text-sm">
                  <span className="text-primary-dark">
                    {formatIDR(Number(d.amount))} · {formatDateTime(d.timestamp)}
                  </span>
                  <Badge tone={DONATION_TONE[d.status] ?? 'sky'}>
                    {d.status === 'CONFIRMED' ? 'Terkonfirmasi' : 'Menunggu'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          to="/donate"
          className="inline-flex items-center min-h-[44px] rounded-full bg-gradient-to-br from-gold to-gold-light px-6 font-bold text-sm text-primary-dark shadow-gold-glow outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <HandHeart size={16} className="mr-2" /> Donasi sekarang
        </Link>
        <Link
          to="/verify"
          className="inline-flex items-center min-h-[44px] rounded-full border-2 border-primary px-6 font-bold text-sm text-primary-dark shadow-teal-glow outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ShieldCheck size={16} className="mr-2" /> Verifikasi publik
        </Link>
      </div>
    </div>
  );
};

export default DonorHome;
