import { Link } from 'react-router-dom';
import { Card, EmptyState, Skeleton, Badge } from '../../components/ui';
import { formatIDR } from '../../utils/format';

interface Campaign {
  id: number;
  title: string;
  current_amount: number | null;
  target_amount: number;
  deadline: string | null;
  status: string;
  created_at?: string;
}

interface PopularCampaignsProps {
  campaigns: Campaign[];
  isLoading: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  setSelectedCampaignId: (id: number | null) => void;
}

const progressPercent = (campaign: Campaign): number => {
  const target = Number(campaign.target_amount) || 0;
  if (target <= 0) return 0;
  const current = Number(campaign.current_amount) || 0;
  return Math.min(100, (current / target) * 100);
};

const daysLeft = (deadline: string | null): string | null => {
  if (!deadline) return null;
  const diff = Date.parse(deadline) - Date.now();
  if (Number.isNaN(diff)) return null;
  const days = Math.ceil(diff / 86400000);
  if (days <= 0) return 'Berakhir';
  return `Sisa ${days} hari`;
};

export const PopularCampaigns = ({
  campaigns,
  isLoading,
  setIsDrawerOpen,
  setSelectedCampaignId,
}: PopularCampaignsProps) => {
  const sorted = [...campaigns].sort((a, b) => {
    const pa = progressPercent(a);
    const pb = progressPercent(b);
    if (pb !== pa) return pb - pa;
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });

  const visible = sorted.slice(0, 6);

  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-0">
              <Skeleton lines={5} className="w-full rounded-lg" />
            </Card>
          ))}
        </div>
      </Card>
    );
  }

  if (visible.length === 0) {
    return (
      <Card className="rounded-2xl p-8">
        <EmptyState
          title="Belum ada kampanye"
          description="Kampanye penggalangan akan tampil di sini."
          action={
            <Link
              to="/campaigns"
              className="inline-flex items-center min-h-[44px] rounded-full border-2 border-primary px-3 py-2 text-sm font-bold text-primary-dark hover:bg-primary-bg"
            >
              Lihat semua kampanye
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl p-0">
      <div className="px-6 pb-6 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-primary-dark">Kampanye Populer</h2>
        <Link
          to="/campaigns"
          className="text-sm font-medium text-primary-dark hover:underline"
        >
          Lihat semua kampanye
        </Link>
      </div>
      <div className="grid gap-4 px-6 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((campaign) => {
          const remaining = daysLeft(campaign.deadline);
          const progress = progressPercent(campaign);
          return (
            <Card
              key={campaign.id}
              variant={
                campaign.status === 'ACTIVE' ? 'default' : 'anomaly'
              }
              className="flex flex-col p-0"
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <Badge tone="primary" className="text-xs">
                    Aktif
                  </Badge>
                </div>
                <h3 className="text-base font-extrabold text-primary-dark mb-2 line-clamp-2">
                  {campaign.title}
                </h3>
                <div className="h-2 rounded-full bg-primary-bg overflow-hidden mb-3">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-primary-dark/70 mb-1">
                  <span>{formatIDR(Number(campaign.current_amount || 0))}</span>
                  <span>Target {formatIDR(Number(campaign.target_amount))}</span>
                </div>
                {remaining && (
                  <p className="text-xs text-primary-dark/70">{remaining}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedCampaignId(campaign.id);
                  setIsDrawerOpen(true);
                }}
                className="w-full min-h-[44px] rounded-none border-t border-transparent bg-transparent text-sm font-bold text-primary-dark shadow-teal-glow hover:bg-primary-bg transition-colors"
              >
                Donasi
              </button>
            </Card>
          );
        })}
      </div>
    </Card>
  );
};

export default PopularCampaigns;
