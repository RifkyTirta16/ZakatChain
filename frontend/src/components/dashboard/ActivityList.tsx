import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, JourneyTracker, Skeleton } from '../../components/ui';
import { formatDateTime, formatIDR } from '../../utils/format';

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

const STATUS_TONE: Record<string, 'warning' | 'success' | 'danger'> = {
  CONFIRMED: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Terkonfirmasi',
  PENDING: 'Menunggu',
  FAILED: 'Gagal',
};

const trackerStep = (status: string): number => {
  if (status === 'CONFIRMED') return 4;
  if (status === 'PENDING') return 2;
  return 2;
};

export const ActivityList = ({
  donations,
  isLoading,
  setIsDrawerOpen,
}: ActivityListProps) => {
  if (isLoading) {
    return (
      <Card>
        <Skeleton lines={5} />
      </Card>
    );
  }

  const recent = donations.slice(0, 5);

  if (recent.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Belum ada aktivitas donasi"
          description="Donasi Anda akan muncul di sini setelah membuat sesi pembayaran."
          action={
            <Button variant="primary" size="sm" onClick={() => setIsDrawerOpen(true)}>
              Mulai Tunaikan Zakat
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="space-y-4 h-full flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-forest-dark">Riwayat Pembayaran Terbaru</h2>
          <Link to="/my-donations" className="text-xs font-semibold text-primary hover:text-forest">
            Lihat Semua →
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {recent.map((d) => (
            <div key={d.id} className="py-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-forest-dark">
                    {d.campaign_id ? `Program Zakat #${d.campaign_id}` : 'Zakat Umum'}
                  </p>
                  <p className="text-xs text-slate-500">{formatDateTime(d.timestamp)}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Badge tone={STATUS_TONE[d.status] ?? 'warning'}>
                    {STATUS_LABEL[d.status] ?? d.status}
                  </Badge>
                  <span className="text-sm font-bold text-forest-dark tabular-nums">
                    {formatIDR(Number(d.amount))}
                  </span>
                </div>
              </div>
              <JourneyTracker
                currentStep={trackerStep(d.status)}
                rejected={d.status === 'FAILED'}
                size="sm"
                showNote={false}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setIsDrawerOpen(true)}>
          Salurkan Zakat Lagi
        </Button>
      </div>
    </Card>
  );
};

export default ActivityList;
