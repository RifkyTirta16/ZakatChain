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
        label="Kontribusi Saya"
        value={formatIDR(myConfirmed)}
        sublabel="Total donasi terkonfirmasi"
        icon={<HeartHandshake size={18} />}
        tone="emerald"
      />
      <StatCard
        label="Total Dana Platform"
        value={platformTotal === null ? '-' : formatIDR(platformTotal)}
        sublabel={platformTotal !== null ? 'Terkonfirmasi sistem' : 'Belum tersedia'}
        icon={<Wallet size={18} />}
        tone="forest"
      />
      <StatCard
        label="Tersalurkan Terverifikasi"
        value={platformDistributed === null ? '-' : formatIDR(platformDistributed)}
        sublabel={platformDistributed !== null ? 'Disetujui & tercatat on-chain' : 'Belum tersedia'}
        icon={<CheckCircle2 size={18} />}
        tone="gold"
      />
      <StatCard
        label="Saldo Siap Salur"
        value={balance === null ? '-' : formatIDR(balance)}
        sublabel={balance !== null ? 'Selisih dana masuk & salur' : 'Belum tersedia'}
        icon={<Scale size={18} />}
        tone="neutral"
      />
    </div>
  );
};
