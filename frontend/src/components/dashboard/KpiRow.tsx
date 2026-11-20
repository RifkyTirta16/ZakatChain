import { Card } from '../../components/ui';
import { formatIDR } from '../../utils/format';

interface KpiCardProps {
  label: string;
  value: number | null;
  hint: string;
}

const KpiCard = ({ label, value, hint }: KpiCardProps) => (
  <Card className="rounded-2xl p-5">
    <p className="text-xs uppercase tracking-wider text-primary-dark/60 mb-1">{label}</p>
    <p className="text-3xl font-extrabold text-primary-dark tabular-nums">
      {value === null ? '-' : formatIDR(value)}
    </p>
    <p className="text-xs text-primary-dark/60 mt-2">{hint}</p>
  </Card>
);

interface KpiRowProps {
  myConfirmed: number;
  platformTotal: number | null;
  platformDistributed: number | null;
}

export const KpiRow = ({ myConfirmed, platformTotal, platformDistributed }: KpiRowProps) => {
  const balance =
    platformTotal !== null && platformDistributed !== null
      ? platformTotal - platformDistributed
      : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Donasi saya" value={myConfirmed} hint="terkonfirmasi" />
      <KpiCard
        label="Total donasi platform"
        value={platformTotal}
        hint={platformTotal !== null ? 'terkonfirmasi' : 'Belum tersedia'}
      />
      <KpiCard
        label="Total terdistribusi platform"
        value={platformDistributed}
        hint={platformDistributed !== null ? 'tersalurkan' : 'Belum tersedia'}
      />
      <KpiCard
        label="Saldo belum tersalurkan"
        value={balance}
        hint={balance !== null ? '(total platform − terdistribusi)' : 'Belum tersedia'}
      />
    </div>
  );
};
