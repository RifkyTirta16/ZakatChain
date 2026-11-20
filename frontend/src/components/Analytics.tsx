import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatIDR } from '../utils/format';
import { Card, EmptyState, StatCard } from './ui';

interface AnalyticsRow {
  category?: string | null;
  amount: number;
}

interface AnalyticsProps {
  data?: AnalyticsRow[];
  transactions?: AnalyticsRow[];
}

const CHART = {
  primary: '#047857',
  forest: '#064E3B',
  gold: '#C9A45C',
  sky: '#0284C7',
  slate: '#64748B',
  grid: '#E2E8F0',
};

const PIE_COLORS = [CHART.primary, CHART.gold, CHART.forest, CHART.sky, CHART.slate];

export const Analytics = ({ data, transactions }: AnalyticsProps) => {
  const rows = useMemo(() => data ?? transactions ?? [], [data, transactions]);

  const chartData = useMemo(() => {
    const categoryData = rows.reduce<Record<string, number>>((acc, t) => {
      const key = t.category || 'Tanpa Kategori';
      acc[key] = (acc[key] || 0) + (Number(t.amount) || 0);
      return acc;
    }, {});
    return Object.keys(categoryData).map((cat) => ({
      name: cat,
      value: categoryData[cat],
    }));
  }, [rows]);

  const totalValue = useMemo(() => chartData.reduce((sum, c) => sum + c.value, 0), [chartData]);

  const topCategory = useMemo(() => {
    if (chartData.length === 0) return '-';
    return [...chartData].sort((a, b) => b.value - a.value)[0].name;
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Belum ada data penyaluran"
          description="Grafik analisis kategori akan tampil otomatis setelah ada transaksi tercatat."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Penyaluran Tercatat" value={formatIDR(totalValue)} tone="emerald" />
        <StatCard label="Jumlah Kategori" value={`${chartData.length} kategori`} tone="gold" />
        <StatCard label="Kategori Terbesar" value={topCategory} tone="forest" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-forest-dark">
              Nominal Penyaluran per Kategori
            </h3>
            <span className="text-xs text-slate-500">Dalam Rupiah (IDR)</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#334155"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  interval={0}
                  tickMargin={8}
                />
                <YAxis
                  stroke="#334155"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickFormatter={(v: number) => formatIDR(v)}
                  width={80}
                />
                <Tooltip
                  cursor={{ fill: '#ECFDF5', opacity: 0.7 }}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#022C22',
                  }}
                  formatter={(value) => [formatIDR(Number(value)), 'Total Tercatat']}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                  formatter={() => <span className="text-xs font-semibold text-forest-dark">Penyaluran</span>}
                />
                <Bar dataKey="value" fill={CHART.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-forest-dark">
              Distribusi Kategori
            </h3>
            <span className="text-xs text-slate-500">Persentase (%)</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {chartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconSize={10}
                  formatter={(value) => <span className="text-xs font-medium text-forest-dark mr-2">{value}</span>}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#022C22',
                  }}
                  formatter={(value, name) => {
                    const total = chartData.reduce((sum, c) => sum + c.value, 0);
                    const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0';
                    return [`${formatIDR(Number(value))} (${pct}%)`, String(name)];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
