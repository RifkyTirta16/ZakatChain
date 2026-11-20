import { Card } from '../../components/ui';
import { Badge } from '../../components/ui';
import { formatIDR, formatDateKey } from '../../utils/format';
import type { SessionUser } from '../../components/layout/navConfig';

interface Donation {
  amount: number;
  status: string;
  timestamp: string;
}

interface WelcomeCardProps {
  user: SessionUser | null;
  donations: Donation[];
}

const StatMini = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) => (
  <div className="space-y-1">
    <p className="text-xs uppercase tracking-wider text-primary-dark/60">{label}</p>
    <p className="text-xl font-extrabold text-primary-dark">{value}</p>
    {hint && <p className="text-xs text-primary-dark/60">{hint}</p>}
  </div>
);

export const WelcomeCard = ({ user, donations }: WelcomeCardProps) => {
  const confirmed = donations.filter((d) => d.status === 'CONFIRMED');
  const total = confirmed.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const count = donations.length;
  const last = donations[0]?.timestamp ?? null;
  const pendingCount = donations.filter((d) => d.status === 'PENDING').length;

  return (
    <Card className="rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-primary-dark/60">Halo</p>
          <h2 className="text-xl font-extrabold text-primary-dark">
            Halo, {user?.username ?? 'Sahabat'}
          </h2>
        </div>
        <Badge tone="primary" className="text-xs">
          {user?.role ?? 'USER'}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-5">
        <StatMini label="Total donasi saya" value={formatIDR(total)} hint="terkonfirmasi" />
        <StatMini label="Jumlah donasi" value={`${count} donasi`} hint="tercatat" />
        <StatMini
          label="Donasi terakhir"
          value={last ? formatDateKey(last) : '-'}
          hint={last ? '' : 'Belum tersedia'}
        />
      </div>

      {count === 0 ? (
        <p className="text-sm text-primary-dark/70">Mulai donasi pertamamu</p>
      ) : pendingCount > 0 ? (
        <p className="text-sm text-primary-dark/70">
          {pendingCount} donasi menunggu konfirmasi
        </p>
      ) : null}
    </Card>
  );
};
