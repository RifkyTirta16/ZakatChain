import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, Heart, Receipt } from 'lucide-react';
import { Badge, Card } from '../../components/ui';
import { formatDateKey, formatIDR } from '../../utils/format';
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

export const WelcomeCard = ({ user, donations }: WelcomeCardProps) => {
  const confirmed = donations.filter((d) => d.status === 'CONFIRMED');
  const total = confirmed.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const last = donations[0]?.timestamp ?? null;
  const pendingCount = donations.filter((d) => d.status === 'PENDING').length;

  return (
    <Card
      variant="glass"
      className="bg-forest-dark bg-crypto-grid text-white h-full flex flex-col justify-between gap-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-gold-light font-bold">
            Assalamu&apos;alaikum
          </p>
          <h2 className="mt-1 font-display text-2xl font-extrabold text-white tracking-tight">
            {user?.username ?? 'Sahabat Muzakki'}
          </h2>
          <p className="mt-1 text-xs text-white/75">
            Pantau amanah zakat, jejak penyaluran multi-wilayah, dan cetak Bukti Setor Zakat (BSZ).
          </p>
        </div>
        <Badge tone="gold" className="bg-gold/20 text-gold-light border-gold/40">
          {user?.role === 'USER' ? 'MUZAKKI' : user?.role ?? 'USER'}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-xl bg-black/25 border border-white/10 p-4">
        <div>
          <p className="text-[11px] text-white/60">Zakat Terkonfirmasi</p>
          <p className="mt-1 font-display text-base sm:text-lg font-extrabold text-white tabular-nums">
            {formatIDR(total)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-white/60">Total Transaksi</p>
          <p className="mt-1 font-display text-base sm:text-lg font-extrabold text-white tabular-nums">
            {donations.length}
          </p>
          {pendingCount > 0 && <p className="text-[11px] text-gold-light">{pendingCount} menunggu</p>}
        </div>
        <div>
          <p className="text-[11px] text-white/60">Terakhir</p>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-white">{last ? formatDateKey(last) : 'Belum ada'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Link
          to="/donate"
          className="inline-flex items-center justify-center gap-2 min-h-[42px] rounded-[10px] bg-gradient-to-b from-gold-light to-gold px-4 py-2 text-xs sm:text-sm font-bold text-forest-dark hover:brightness-105 shadow-gold-glow transition-all"
        >
          <Heart size={15} /> Tunaikan Zakat
        </Link>
        <Link
          to="/my-donations"
          className="inline-flex items-center justify-center gap-2 min-h-[42px] rounded-[10px] border border-white/20 bg-white/10 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-white/15 transition-colors"
        >
          <Receipt size={15} /> Riwayat & BSZ
        </Link>
        <Link
          to="/calculator"
          className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3 text-xs sm:text-sm font-semibold text-gold-light hover:text-white transition-colors"
        >
          <Calculator size={15} /> Kalkulator <ArrowRight size={13} />
        </Link>
      </div>
    </Card>
  );
};
