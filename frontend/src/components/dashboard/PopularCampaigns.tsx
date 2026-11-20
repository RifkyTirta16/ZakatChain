import { Link } from 'react-router-dom';
import { ArrowRight, Heart } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Skeleton } from '../../components/ui';
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
      <Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} lines={5} />
          ))}
        </div>
      </Card>
    );
  }

  if (visible.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Belum ada program penyaluran"
          description="Program zakat yang tersedia akan tampil di sini."
          action={
            <Link
              to="/campaigns"
              className="inline-flex items-center min-h-[40px] rounded-[10px] border border-slate-300 px-4 text-sm font-semibold text-forest-dark hover:bg-mint"
            >
              Lihat Semua Program
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="space-y-5 h-full">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-forest-dark">Program Zakat Populer</h2>
        <Link
          to="/campaigns"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-forest"
        >
          Semua Program <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.slice(0, 4).map((campaign) => {
          const remaining = daysLeft(campaign.deadline);
          const progress = progressPercent(campaign);
          return (
            <div
              key={campaign.id}
              className="rounded-xl border border-slate-200/80 bg-cream/60 p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2.5">
                <div className="flex justify-between items-center gap-2">
                  <Badge tone={campaign.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {campaign.status === 'ACTIVE' ? 'Aktif' : campaign.status}
                  </Badge>
                  {remaining && <span className="text-[11px] text-slate-500">{remaining}</span>}
                </div>
                <Link
                  to={`/campaigns/${campaign.id}`}
                  className="block text-sm font-bold text-forest-dark hover:text-primary line-clamp-2"
                >
                  {campaign.title}
                </Link>
                <div className="h-2 rounded-full bg-slate-200/70 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-600 tabular-nums">
                  <span className="font-semibold text-forest-dark">
                    {formatIDR(Number(campaign.current_amount || 0))}
                  </span>
                  <span>Target {formatIDR(Number(campaign.target_amount))}</span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedCampaignId(campaign.id);
                  setIsDrawerOpen(true);
                }}
                className="w-full"
              >
                <Heart size={14} /> Salurkan
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default PopularCampaigns;
