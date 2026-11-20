import { Link } from 'react-router-dom';
import { Card, EmptyState, Skeleton, Badge, JourneyTracker } from '../../components/ui';
import { formatIDR, formatDateTime } from '../../utils/format';

interface Donation {
  id: number;
  campaign_id: number | null;
  amount: number;
  status: string;
  timestamp: string;
}

interface ActivityListProps {
  donations: Donation[];
  isLoading: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

const STATUS_TONE: Record<string, 'sky' | 'success' | 'coral'> = {
  CONFIRMED: 'success',
  PENDING: 'sky',
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Terkonfirmasi',
  PENDING: 'Menunggu',
};

const trackerStep = (status: string): number => {
  if (status === 'CONFIRMED') return 4;
  if (status === 'PENDING') return 3;
  return 1;
};

const trackerRejected = (status: string): boolean => {
  return status === 'FAILED';
};

export const ActivityList = ({
  donations,
  isLoading,
  setIsDrawerOpen,
}: ActivityListProps) => {
  if (isLoading) {
    return (
      <Card className="rounded-2xl p-6">
        <Skeleton lines={5} className="w-full rounded-lg" />
      </Card>
    );
  }

  const recent = donations.slice(0, 5);

  if (recent.length === 0) {
    return (
      <Card className="rounded-2xl p-8">
        <EmptyState
          title="Belum ada aktivitas"
          description="Donasi Anda akan muncul di sini setelah pembuatan sesi pembayaran."
          action={
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center min-h-[44px] rounded-full border-2 border-primary px-3 py-2 text-sm font-bold text-primary-dark hover:bg-primary-bg"
            >
              Mulai donasi
            </button>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl p-0">
      <div className="px-6 pb-4 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-primary-dark">Aktivitas Transaksi</h2>
        <Link
          to="/donate"
          className="text-sm font-medium text-primary-dark hover:underline"
        >
          Lihat semua
        </Link>
      </div>
      <div className="divide-y divide-dashed px-6">
        {recent.map((d) => (
          <div key={d.id} className="py-4 flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary-dark truncate">
                {d.campaign_id ? `Kampanye #${d.campaign_id}` : 'Donasi umum'}
              </p>
              <p className="text-xs text-primary-dark/60 truncate">
                {formatDateTime(d.timestamp)}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <JourneyTracker
                currentStep={trackerStep(d.status)}
                rejected={trackerRejected(d.status)}
                size="sm"
              />
              <Badge tone={STATUS_TONE[d.status] ?? 'sky'}>
                {STATUS_LABEL[d.status] ?? d.status}
              </Badge>
              <span className="text-sm font-bold text-primary-dark tabular-nums">
                {formatIDR(Number(d.amount))}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 pt-4 pb-6 text-right">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="min-h-[44px] rounded-xl border-2 border-transparent bg-transparent text-sm font-bold text-primary-dark hover:bg-primary-bg"
        >
          Donasi lagi
        </button>
      </div>
    </Card>
  );
};

export default ActivityList;
