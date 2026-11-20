import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, Skeleton } from '../../components/ui';
import apiClient from '../../utils/api';
import { formatIDR, formatNumber } from '../../utils/format';
import { ON_CHAIN_NOTE } from '../../components/ui/badgeStatus';

interface RegionStat {
  region: string;
  province: string;
  region_code: string;
  poverty_rate: number;
  poor_population: number;
  total_distributed: number;
  total_reports: number;
  target_amount: number;
  gap: number;
  reach_percentage: number;
  priority_score: string;
  status: 'CRITICAL' | 'WARNING' | 'STABLE';
}

interface Transaction {
  id: number;
  amount: number;
  category: string | null;
  region: string | null;
  status: string;
  timestamp: string;
  tx_hash: string | null;
  blockchain_status: string | null;
  block_number: number | null;
}

interface DashboardStats {
  kpis: {
    totalDistributed: number;
    verifiedReports: number;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  Konsumsi: '#2BA8A2',
  Kesehatan: '#FFD23F',
  Pendidikan: '#EF6C4A',
  'Modal Usaha': '#5DADE2',
};

export const ImpactPanel = () => {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardStats>('/dashboard/stats');
      return data;
    },
  });

  const { data: regions, isLoading: regionsLoading } = useQuery<RegionStat[]>({
    queryKey: ['mapping-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<RegionStat[]>('/mapping/stats');
      return data;
    },
  });

  const { data: transactions, isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data } = await apiClient.get<Transaction[]>('/transactions');
      return data;
    },
  });

  const isLoading = statsLoading || regionsLoading || txLoading;

  const totalDistributed = stats?.kpis.totalDistributed ?? 0;
  const verifiedReports = stats?.kpis.verifiedReports ?? 0;
  const regionCount = regions?.length ?? 0;

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    (transactions ?? []).forEach((t) => {
      const cat = t.category ?? 'Lainnya';
      map.set(cat, (map.get(cat) || 0) + Number(t.amount || 0));
    });
    return Array.from(map.entries()).map(([category, total]) => ({ category, total }));
  }, [transactions]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl p-6">
        <Skeleton lines={4} className="w-full rounded-xl" />
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl p-0">
      <div className="px-6 pb-6">
        <h2 className="text-lg font-extrabold text-primary-dark mb-6">Dampak Sosial</h2>
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <div className="bg-primary-bg rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-primary-dark/60 mb-1">Total terdistribusi</p>
            <p className="text-2xl font-extrabold text-primary-dark tabular-nums">{formatIDR(totalDistributed)}</p>
          </div>
          <div className="bg-gold-light/40 rounded-xl p-4 border-l-4 border-gold">
            <p className="text-xs uppercase tracking-wider text-primary-dark/60 mb-1">Wilayah terjangkau</p>
            <p className="text-2xl font-extrabold text-primary-dark tabular-nums">{formatNumber(regionCount)}</p>
          </div>
          <div className="bg-success/15 rounded-xl p-4 border-l-4 border-success">
            <p className="text-xs uppercase tracking-wider text-green-800 mb-1">Bukti ditinjau</p>
            <p className="text-2xl font-extrabold text-primary-dark tabular-nums">{formatNumber(verifiedReports)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/70 shadow-card">
          <p className="text-xs uppercase tracking-wider text-primary-dark/60 mb-4">Distribusi per kategori</p>
          <div className="h-64">
            {(categoryData.length === 0 ? (
              <EmptyState title="Belum ada data kategori" description="Data distribusi per kategori akan muncul di sini." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#4B5563' }} axisLine={false} tickMargin={10} />
                  <YAxis tick={{ fontSize: 12, fill: '#4B5563' }} axisLine={false} hide />
                  <Tooltip
                    formatter={(value) => formatIDR(Number(value ?? 0))}
                    labelFormatter={(label) => label}
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px' }}
                    itemStyle={{ color: '#1F2937' }}
                  />
                  <Legend verticalAlign="top" align="right" height={36} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="#2BA8A2" />
                </BarChart>
              </ResponsiveContainer>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {categoryData.map((item) => (
              <span
                key={item.category}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-primary-bg border border-primary/30"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.category] ?? '#9CA3AF' }} />
                {item.category}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-cream rounded-xl p-3 text-xs text-primary-dark/70 border border-cream">
          {ON_CHAIN_NOTE}
        </div>
        <p className="mt-2 text-xs text-primary-dark/60">
          Angka di atas adalah agregat platform. Donasi tercatat dan terverifikasi hash sesuai catatan sistem.
        </p>
      </div>
    </Card>
  );
};

export default ImpactPanel;
