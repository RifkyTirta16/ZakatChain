import { CheckCircle2, HeartHandshake, Scale, Wallet } from 'lucide-react';
import { StatCard } from '../../components/ui';
import { formatIDR } from '../../utils/format';

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
      <StatCard
        label="Zakat Saya"
        value={formatIDR(myConfirmed)}
        sublabel="Total donasi terkonfirmasi"
        icon={<HeartHandshake size={18} />}
        tone="emerald"
      />
      <StatCard
        label="Terkumpul Platform"
        value={platformTotal === null ? '-' : formatIDR(platformTotal)}
        sublabel={platformTotal !== null ? 'Total donasi terkonfirmasi' : 'Belum tersedia'}
        icon={<Wallet size={18} />}
        tone="forest"
      />
      <StatCard
        label="Dana Tersalurkan"
        value={platformDistributed === null ? '-' : formatIDR(platformDistributed)}
        sublabel={platformDistributed !== null ? 'Terverifikasi & tercatat' : 'Belum tersedia'}
        icon={<CheckCircle2 size={18} />}
        tone="gold"
      />
      <StatCard
        label="Saldo Amanah"
        value={balance === null ? '-' : formatIDR(balance)}
        sublabel={balance !== null ? 'Sisa dana siap salur' : 'Belum tersedia'}
        icon={<Scale size={18} />}
        tone="neutral"
      />
    </div>
  );
};
