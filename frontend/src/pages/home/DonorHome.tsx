import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe, ShieldCheck } from 'lucide-react';
import { Card, ON_CHAIN_NOTE, Skeleton } from '../../components/ui';
import { WelcomeCard } from '../../components/dashboard/WelcomeCard';
import { KpiRow } from '../../components/dashboard/KpiRow';
import { QuickDonation } from '../../components/dashboard/QuickDonation';
import { PopularCampaigns } from '../../components/dashboard/PopularCampaigns';
import { ActivityList } from '../../components/dashboard/ActivityList';
import DonationDrawer from '../../components/dashboard/DonationDrawer';
import {
  useCampaigns,
  useDashboardStats,
  useDonorDonations,
} from '../../components/dashboard/hooks/useDashboardData';
import type { SessionUser } from '../../components/layout/navConfig';

const DonorHome = ({ user }: { user: SessionUser | null }) => {
  const donorId = user?.id ?? null;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);

  const { data: donations, isLoading: donationsLoading } = useDonorDonations(donorId);
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns();

  const myConfirmed = (donations ?? [])
    .filter((d: { status: string; amount: number }) => d.status === 'CONFIRMED')
    .reduce((sum: number, d: { amount: number }) => sum + Number(d.amount || 0), 0);

  const platformTotal = stats?.kpis.totalDonations ?? null;
  const platformDistributed = stats?.kpis.totalDistributed ?? null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {donationsLoading ? (
            <Skeleton lines={8} />
          ) : (
            <WelcomeCard user={user} donations={donations ?? []} />
          )}
        </div>
        <div className="lg:col-span-5">
          <QuickDonation />
        </div>
      </div>

      <div>
        {statsLoading ? (
          <Skeleton lines={4} />
        ) : (
          <KpiRow
            myConfirmed={myConfirmed}
            platformTotal={platformTotal}
            platformDistributed={platformDistributed}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {campaignsLoading ? (
            <Skeleton lines={6} />
          ) : (
            <PopularCampaigns
              campaigns={campaigns ?? []}
              isLoading={campaignsLoading}
              setIsDrawerOpen={setIsDrawerOpen}
              setSelectedCampaignId={setSelectedCampaignId}
            />
          )}
        </div>
        <div className="lg:col-span-5">
          <ActivityList
            donations={donations ?? []}
            isLoading={donationsLoading}
            setIsDrawerOpen={setIsDrawerOpen}
          />
        </div>
      </div>

      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-cream/70">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-forest-dark flex items-center gap-2">
            <Globe size={17} className="text-primary" /> Pantau Dampak &amp; Verifikasi Penyaluran
          </h2>
          <p className="text-xs text-slate-600">{ON_CHAIN_NOTE}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/transparency"
            className="inline-flex items-center gap-1.5 min-h-[40px] rounded-[10px] border border-primary/30 bg-white px-4 text-xs sm:text-sm font-semibold text-forest-dark hover:bg-mint transition-colors"
          >
            Portal Transparansi <ArrowRight size={14} />
          </Link>
          <Link
            to="/verify"
            className="inline-flex items-center gap-1.5 min-h-[40px] rounded-[10px] bg-primary px-4 text-xs sm:text-sm font-semibold text-white hover:bg-forest transition-colors"
          >
            <ShieldCheck size={14} /> Verifikasi Laporan
          </Link>
        </div>
      </Card>

      <DonationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialCampaignId={selectedCampaignId}
      />
    </div>
  );
};

export default DonorHome;
