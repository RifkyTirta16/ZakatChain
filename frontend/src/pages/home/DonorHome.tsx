import { useState } from 'react';
import { Skeleton } from '../../components/ui';
import { WelcomeCard } from '../../components/dashboard/WelcomeCard';
import { KpiRow } from '../../components/dashboard/KpiRow';
import { QuickDonation } from '../../components/dashboard/QuickDonation';
import { PopularCampaigns } from '../../components/dashboard/PopularCampaigns';
import { ImpactPanel } from '../../components/dashboard/ImpactPanel';
import { ActivityList } from '../../components/dashboard/ActivityList';
import { ChainPanel } from '../../components/dashboard/ChainPanel';
import { DistributionMap } from '../../components/dashboard/DistributionMap';
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
        <div className="lg:col-span-8">
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
        <div className="lg:col-span-4">
          <ImpactPanel />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ActivityList
            donations={donations ?? []}
            isLoading={donationsLoading}
            setIsDrawerOpen={setIsDrawerOpen}
          />
        </div>
        <div className="lg:col-span-5">
          <ChainPanel />
        </div>
      </div>

      <DistributionMap />

      <DonationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialCampaignId={selectedCampaignId}
      />
    </div>
  );
};

export default DonorHome;
