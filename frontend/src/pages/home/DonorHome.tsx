import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../utils/api';
import { Skeleton, ActionPanel, Card, Badge } from '../../components/ui';
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
  useDonorDonations,
  useDashboardStats,
  useCampaigns,
  useTransactions,
} from '../../components/dashboard/hooks/useDashboardData';
import type { SessionUser } from '../../components/layout/navConfig';

interface ReconciliationLog {
  id: number;
  reconciliation_date: string;
  total_donations: number | null;
  total_distributions: number | null;
  balance: number | null;
  status: string | null;
  notes: string | null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const checkOverdue = (dateStr?: string): boolean => {
  if (!dateStr) return true;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t > SEVEN_DAYS_MS;
};

const DonorHome = ({ user }: { user: SessionUser | null }) => {
  const donorId = user?.id ?? null;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);

  const { data: donations, isLoading: donationsLoading } = useDonorDonations(donorId);
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns();
  const { data: transactions } = useTransactions();

  const isAdminRole = user?.role === 'ADMIN' || user?.role === 'AUDITOR' || user?.role === 'AMIL';

  const { data: reconciliationLogs } = useQuery<ReconciliationLog[]>({
    queryKey: ['reconciliation-history'],
    queryFn: async () => {
      const { data } = await apiClient.get<ReconciliationLog[]>('/reconciliation/history');
      return data;
    },
    enabled: user?.role === 'ADMIN' || user?.role === 'AUDITOR',
  });

  const pendingProofs = (transactions ?? []).filter(
    (t) =>
      t.proof_status === null ||
      t.proof_status === undefined ||
      ['DRAFT', 'PENDING', 'PENDING_BLOCKCHAIN'].includes(t.proof_status)
  ).length;

  const openAnomalies = stats?.kpis?.openAnomalies ?? 0;

  const isReconciliationOverdue =
    (user?.role === 'ADMIN' || user?.role === 'AUDITOR') &&
    reconciliationLogs !== undefined &&
    checkOverdue(reconciliationLogs[0]?.reconciliation_date);

  const actionTasks = isAdminRole
    ? [
        { label: 'Bukti menunggu review', jumlah: pendingProofs, href: '/proofs', tone: 'sky' as const },
        { label: 'Anomali terbuka', jumlah: openAnomalies, href: '/anomalies', tone: 'coral' as const },
        { label: 'Rekonsiliasi > 7 hari', jumlah: isReconciliationOverdue ? 1 : 0, href: '/reconciliation', tone: 'gold' as const },
      ]
    : [];

  const networkStatus = stats?.networkStatus as
    | { rpc?: string; contract?: string; status?: string }
    | undefined;
  const rpc = networkStatus?.rpc;
  const contract = networkStatus?.contract;
  const status = networkStatus?.status;

  let systemTone: 'success' | 'coral' | 'gold' | 'sky' = 'success';
  let systemBadge = 'Optimal';
  let systemExplanation =
    'Database: normal (SQLite aktif). Jaringan blockchain: terhubung (RPC responsif). Kontrak: aktif (bytecode terverifikasi di node).';

  if (status === 'Healthy') {
    systemTone = 'success';
    systemBadge = 'Optimal';
    systemExplanation =
      'Database: normal (SQLite aktif). Jaringan blockchain: terhubung (RPC responsif). Kontrak: aktif (bytecode terverifikasi di node).';
  } else if (status === 'Degraded') {
    systemTone = 'coral';
    systemBadge = 'Perlu Perhatian';
    if (rpc === 'Connected' && contract === 'No contract code') {
      systemExplanation =
        'Database: normal (SQLite aktif). Jaringan blockchain: terhubung (RPC responsif). Kontrak: belum terpasang (bytecode kosong di alamat target).';
    } else if (rpc === 'Unreachable') {
      systemExplanation =
        'Database: normal (SQLite aktif). Jaringan blockchain: tidak terjangkau (RPC timeout). Kontrak: status tidak diketahui.';
    } else {
      systemExplanation = `Database: normal (SQLite aktif). Jaringan blockchain: ${rpc ?? 'terdegradasi'}. Kontrak: ${contract ?? 'status tidak diketahui'}.`;
    }
  } else if (status === 'Unknown' || statsLoading) {
    systemTone = 'gold';
    systemBadge = 'Memeriksa';
    systemExplanation =
      'Database: normal (SQLite aktif). Jaringan blockchain: sedang memeriksa konektivitas RPC. Kontrak: menunggu verifikasi status.';
  }

  const myConfirmed = (donations ?? [])
    .filter((d: { status: string; amount: number }) => d.status === 'CONFIRMED')
    .reduce((sum: number, d: { amount: number }) => sum + Number(d.amount || 0), 0);

  const platformTotal = stats?.kpis.totalDonations ?? null;
  const platformDistributed = stats?.kpis.totalDistributed ?? null;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#F6F8F8' }}
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Baris 0: Perlu Tindakan & Status Sistem (ADMIN, AUDITOR, AMIL) */}
        {isAdminRole && (
          <div className="mb-8 space-y-4">
            {user?.role === 'ADMIN' && (
              <Card className="rounded-2xl p-5 border-l-4 border-primary bg-white shadow-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <h2 className="text-sm font-extrabold text-primary-dark uppercase tracking-wider">
                      Status Sistem
                    </h2>
                    <p className="text-xs text-primary-dark/60">Pemeriksaan kesehatan infrastruktur platform</p>
                  </div>
                  <div>
                    <Badge tone={systemTone}>{systemBadge}</Badge>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-primary-dark/80 leading-relaxed font-medium bg-primary-bg/40 p-3 rounded-xl border border-primary-bg">
                  {systemExplanation}
                </p>
              </Card>
            )}

            <div>
              <h2 className="text-sm uppercase tracking-wider text-primary-dark/60 mb-2">Perlu tindakan</h2>
              <ActionPanel tasks={actionTasks} />
            </div>
          </div>
        )}

        {/* Baris 1: Hero */}
        <div className="grid gap-6 sm:grid-cols-12 mb-8">
          <div className="col-span-12 sm:col-span-7">
            {donationsLoading ? (
              <Skeleton lines={6} className="w-full rounded-xl" />
            ) : (
              <WelcomeCard user={user} donations={donations ?? []} />
            )}
          </div>
          <div className="col-span-12 sm:col-span-5">
            <QuickDonation />
          </div>
        </div>

        {/* Baris 2: KPI */}
        <div className="mb-8">
          {statsLoading ? (
            <Skeleton lines={3} className="w-full rounded-xl" />
          ) : (
            <KpiRow
              myConfirmed={myConfirmed}
              platformTotal={platformTotal}
              platformDistributed={platformDistributed}
            />
          )}
        </div>

        {/* Baris 3: Kampanye populer + Dampak sosial */}
        <div className="grid gap-6 sm:grid-cols-12 mb-8">
          <div className="col-span-12 sm:col-span-8">
            {campaignsLoading ? (
              <Skeleton lines={3} className="w-full rounded-xl" />
            ) : (
              <PopularCampaigns
                campaigns={campaigns ?? []}
                isLoading={campaignsLoading}
                setIsDrawerOpen={setIsDrawerOpen}
                setSelectedCampaignId={setSelectedCampaignId}
              />
            )}
          </div>
          <div className="col-span-12 sm:col-span-4">
            <ImpactPanel />
          </div>
        </div>

        {/* Baris 4: Aktivitas transaksi + Transparansi blockchain */}
        <div className="grid gap-6 sm:grid-cols-12 mb-8">
          <div className="col-span-12 sm:col-span-7">
            {donationsLoading ? (
              <Skeleton lines={3} className="w-full rounded-xl" />
            ) : (
              <ActivityList
                donations={donations ?? []}
                isLoading={donationsLoading}
                setIsDrawerOpen={setIsDrawerOpen}
              />
            )}
          </div>
          <div className="col-span-12 sm:col-span-5">
            <ChainPanel />
          </div>
        </div>

        {/* Baris 5: Peta distribusi */}
        <div className="col-span-12">
          <DistributionMap />
        </div>
      </div>

      <DonationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialCampaignId={selectedCampaignId}
      />
    </div>
  );
};

export default DonorHome;
