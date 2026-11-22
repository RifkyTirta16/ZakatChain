import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Skeleton } from '../../components/ui';
import { formatDateTime, formatIDR } from '../../utils/format';

interface Donation {
  id: number;
  campaign_id: number | null;
  campaign_title?: string | null;
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

  const recent = donations.slice(0, 3);

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
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-forest-dark">Riwayat Terbaru</h2>
          <Link to="/my-donations" className="text-xs font-semibold text-primary hover:text-forest">
            Semua & BSZ →
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {recent.map((d) => (
            <div key={d.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-forest-dark truncate">
                  {d.campaign_title || (d.campaign_id ? `Program Zakat #${d.campaign_id}` : 'Zakat Umum')}
                </p>
                <p className="text-xs text-slate-500">{formatDateTime(d.timestamp)}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-sm font-bold text-forest-dark tabular-nums">
                  {formatIDR(Number(d.amount))}
                </span>
                <Badge tone={STATUS_TONE[d.status] ?? 'warning'}>
                  {STATUS_LABEL[d.status] ?? d.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <Link to="/my-donations" className="text-xs font-semibold text-slate-600 hover:text-primary">
          Cetak Bukti Setor (BSZ)
        </Link>
        <Button variant="secondary" size="sm" onClick={() => setIsDrawerOpen(true)}>
          Salurkan Lagi
        </Button>
      </div>
    </Card>
  );
};

export default ActivityList;
