import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, EmptyState, Skeleton } from '../../components/ui';
import { formatIDR, formatNumber } from '../../utils/format';
import { ON_CHAIN_NOTE } from '../../components/ui/badgeStatus';
import {
  useDashboardStats,
  useTransactions,
  useRegionStats,
} from './hooks/useDashboardData';

const CATEGORY_COLORS: Record<string, string> = {
  Konsumsi: '#2BA8A2',
  Pendidikan: '#5DADE2',
  Kesehatan: '#EF6C4A',
  'Modal Usaha': '#FFD23F',
  Lainnya: '#1E8C86',
};

const DEFAULT_COLORS = ['#2BA8A2', '#5DADE2', '#FFD23F', '#EF6C4A', '#1E8C86'];

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

    const list = Array.from(map.entries()).map(([category, total]) => ({
      category,
      total,
    }));

    if (list.length > 0) return list;

    if (stats?.categoryDistribution && stats.categoryDistribution.length > 0) {
      return (stats.categoryDistribution as Array<{ category?: string; total?: number }>).map(
        (item) => ({
          category: String(item.category || 'Lainnya'),
          total: Number(item.total || 0),
        })
      );
    }

    return [];
  }, [transactions, stats]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl p-6">
        <Skeleton lines={6} className="w-full rounded-xl" />
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl p-6">
      <div className="mb-4">
        <h2 className="text-lg font-extrabold text-primary-dark">Dampak Sosial</h2>
        <p className="text-xs text-primary-dark/70 mt-0.5">
          Agregat data distribusi berdasarkan catatan transaksi sistem.
        </p>
      </div>

      {/* Metrik Agregat */}
      <div className="space-y-2.5 mb-5">
        <div className="bg-primary-bg rounded-xl p-3">
          <p className="text-[11px] uppercase tracking-wider text-primary-dark/70 font-semibold mb-0.5">
            Total tersalurkan (tercatat)
          </p>
          <p className="text-xl font-extrabold text-primary-dark tabular-nums">
            {formatIDR(totalDistributed)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-cream rounded-xl p-3 border-l-4 border-gold">
            <p className="text-[10px] uppercase tracking-wider text-primary-dark/70 font-semibold mb-0.5">
              Wilayah
            </p>
            <p className="text-base font-extrabold text-primary-dark tabular-nums">
              {formatNumber(regionCount)} <span className="text-xs font-normal">wilayah</span>
            </p>
          </div>
          <div className="bg-primary-bg/50 rounded-xl p-3 border-l-4 border-primary">
            <p className="text-[10px] uppercase tracking-wider text-primary-dark/70 font-semibold mb-0.5">
              Terverifikasi
            </p>
            <p className="text-base font-extrabold text-primary-dark tabular-nums">
              {formatNumber(verifiedReports)} <span className="text-xs font-normal">bukti hash</span>
            </p>
          </div>
        </div>
      </div>

      {/* Visualisasi Donut Recharts per Kategori */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/70 shadow-card mb-4">
        <p className="text-[11px] uppercase tracking-wider text-primary-dark/70 font-semibold mb-2">
          Distribusi per Kategori
        </p>

        {categoryData.length === 0 ? (
          <EmptyState
            title="Belum ada data kategori"
            description="Data distribusi per kategori akan tercatat di sini."
          />
        ) : (
          <div>
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
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {categoryData.map((entry, idx) => (
                      <Cell
                        key={`cell-${entry.category}`}
                        fill={
                          CATEGORY_COLORS[entry.category] ??
                          DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [
                      formatIDR(Number(val ?? 0)),
                      'Tercatat',
                    ]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      fontSize: '11px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
              {categoryData.map((item, idx) => (
                <span
                  key={item.category}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-bg text-primary-dark border border-primary/20"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        CATEGORY_COLORS[item.category] ??
                        DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
                    }}
                  />
                  {item.category}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Catatan Wajib */}
      <div className="bg-cream rounded-xl p-3 text-xs text-primary-dark/70 border border-cream">
        {ON_CHAIN_NOTE}
      </div>
      <p className="mt-2 text-[11px] text-primary-dark/60 leading-relaxed">
        Angka di atas merupakan agregat platform. Penyaluran berstatus tercatat dan terverifikasi hash sesuai catatan sistem.
      </p>
    </Card>
  );
};

export default ImpactPanel;
