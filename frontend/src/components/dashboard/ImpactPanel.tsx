import { useMemo } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, EmptyState, ON_CHAIN_NOTE, Skeleton } from '../../components/ui';
import { formatIDR, formatNumber } from '../../utils/format';
import {
  useDashboardStats,
  useRegionStats,
  useTransactions,
} from './hooks/useDashboardData';

const CATEGORY_COLORS: Record<string, string> = {
  Konsumsi: '#047857',
  Pendidikan: '#0284C7',
  Kesehatan: '#064E3B',
  'Modal Usaha': '#C9A45C',
  Lainnya: '#64748B',
};

const DEFAULT_COLORS = ['#047857', '#C9A45C', '#064E3B', '#0284C7', '#64748B'];

export const ImpactPanel = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: transactions, isLoading: txLoading } = useTransactions();
  const { data: regions, isLoading: regionsLoading } = useRegionStats();

  const isLoading = statsLoading || txLoading || regionsLoading;

  const totalDistributed = stats?.kpis.totalDistributed ?? 0;
  const verifiedReports =
    stats?.kpis.verifiedReports ??
    (transactions ?? []).filter((t) => t.blockchain_status === 'CONFIRMED').length;

  const regionCount = useMemo(() => {
    if (regions && regions.length > 0) return regions.length;
    const distinct = new Set((transactions ?? []).map((t) => t.region).filter(Boolean));
    return distinct.size;
  }, [regions, transactions]);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    (transactions ?? []).forEach((t) => {
      const cat = t.category?.trim() || 'Lainnya';
      map.set(cat, (map.get(cat) || 0) + Number(t.amount || 0));
    });

    const list = Array.from(map.entries()).map(([category, total]) => ({ category, total }));
    if (list.length > 0) return list;

    if (stats?.categoryDistribution && stats.categoryDistribution.length > 0) {
      return (stats.categoryDistribution as Array<{ category?: string; total?: number }>).map(
        (item) => ({
          category: String(item.category || 'Lainnya'),
          total: Number(item.total || 0),
        }),
      );
    }
    return [];
  }, [transactions, stats]);

  if (isLoading) {
    return (
      <Card>
        <Skeleton lines={7} />
      </Card>
    );
  }

  return (
    <Card className="space-y-4 h-full">
      <div>
        <h2 className="text-lg font-bold text-forest-dark">Dampak Penyaluran</h2>
        <p className="text-xs text-slate-500 mt-0.5">Ringkasan agregat kategori penyaluran platform.</p>
      </div>

      <div className="space-y-2.5">
        <div className="bg-mint rounded-xl p-3.5 border border-primary/20">
          <p className="text-[11px] uppercase tracking-wider text-forest font-semibold">
            Total Tersalurkan Terverifikasi
          </p>
          <p className="mt-0.5 text-xl font-extrabold text-forest-dark tabular-nums">
            {formatIDR(totalDistributed)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-cream rounded-xl p-3 border border-slate-200/80">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Wilayah</p>
            <p className="mt-0.5 text-base font-bold text-forest-dark tabular-nums">
              {formatNumber(regionCount)} <span className="text-xs font-normal text-slate-500">daerah</span>
            </p>
          </div>
          <div className="bg-cream rounded-xl p-3 border border-slate-200/80">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">On-Chain</p>
            <p className="mt-0.5 text-base font-bold text-forest-dark tabular-nums">
              {formatNumber(verifiedReports)} <span className="text-xs font-normal text-slate-500">laporan</span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-3 border border-slate-200/80 bg-white">
        <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
          Porsi per Kategori
        </p>

        {categoryData.length === 0 ? (
          <EmptyState
            title="Belum ada data kategori"
            description="Kategori penyaluran akan tampil di sini."
          />
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={62}
                  paddingAngle={3}
                >
                  {categoryData.map((entry, idx) => (
                    <Cell
                      key={entry.category}
                      fill={CATEGORY_COLORS[entry.category] ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [formatIDR(Number(val ?? 0)), 'Tercatat']}
                  contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-500">{ON_CHAIN_NOTE}</p>
    </Card>
  );
};

export default ImpactPanel;
