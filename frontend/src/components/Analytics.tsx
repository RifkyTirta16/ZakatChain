import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatIDR } from '../utils/format';
import { Card, EmptyState } from './ui';

interface AnalyticsProps {
  data: { category?: string | null; amount: number }[];
}

/** Token warna resmi ZakatChain dari DESIGN.md */
const CHART = {
  primary: '#2BA8A2',
  primaryDark: '#1E8C86',
  gold: '#FFD23F',
  coral: '#EF6C4A',
  sky: '#5DADE2',
  grid: '#E2E8F0',
};

const PIE_COLORS = [CHART.primary, CHART.gold, CHART.coral, CHART.sky, CHART.primaryDark];

export const Analytics = ({ data }: AnalyticsProps) => {
  const chartData = useMemo(() => {
    const categoryData = (data ?? []).reduce<Record<string, number>>((acc, t) => {
      const key = t.category || 'Tanpa Kategori';
      acc[key] = (acc[key] || 0) + (Number(t.amount) || 0);
      return acc;
    }, {});
    return Object.keys(categoryData).map((cat) => ({
      name: cat,
      value: categoryData[cat],
    }));
  }, [data]);

  const totalValue = useMemo(
    () => chartData.reduce((sum, c) => sum + c.value, 0),
    [chartData]
  );

  const topCategory = useMemo(() => {
    if (chartData.length === 0) return '-';
    return [...chartData].sort((a, b) => b.value - a.value)[0].name;
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card className="rounded-2xl p-6 bg-white border border-slate-200/70 shadow-card mb-6">
        <EmptyState
          title="Belum ada data penyaluran"
          description="Grafik analisis kategori akan tampil otomatis setelah ada transaksi tercatat."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kartu Ringkasan Analisis */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl p-5 bg-white border border-slate-200/70 shadow-card">
          <p className="text-xs uppercase tracking-wider text-primary-dark/60 font-semibold mb-1">
            Total Penyaluran Tercatat
          </p>
          <p className="text-2xl font-extrabold text-primary-dark tabular-nums">
            {formatIDR(totalValue)}
          </p>
        </Card>

        <Card className="rounded-2xl p-5 bg-white border border-slate-200/70 shadow-card">
          <p className="text-xs uppercase tracking-wider text-primary-dark/60 font-semibold mb-1">
            Jumlah Kategori
          </p>
          <p className="text-2xl font-extrabold text-primary-dark tabular-nums">
            {chartData.length} <span className="text-sm font-normal text-primary-dark/70">kategori</span>
          </p>
        </Card>

        <Card className="rounded-2xl p-5 bg-white border border-slate-200/70 shadow-card">
          <p className="text-xs uppercase tracking-wider text-primary-dark/60 font-semibold mb-1">
            Kategori Terbesar
          </p>
          <p className="text-lg font-extrabold text-primary-dark truncate">
            {topCategory}
          </p>
        </Card>
      </div>

      {/* Grid 2 Grafik: BarChart & PieChart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik Batang Penyaluran per Kategori */}
        <Card className="rounded-2xl p-6 bg-white border border-slate-200/70 shadow-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-primary-dark">
              Nominal Penyaluran per Kategori
            </h3>
            <span className="text-xs text-primary-dark/60 font-medium">Dalam Rupiah (Rp)</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={CHART.primaryDark}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  interval={0}
                  tickMargin={8}
                />
                <YAxis
                  stroke={CHART.primaryDark}
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickFormatter={(v: number) => formatIDR(v)}
                  width={75}
                />
                <Tooltip
                  cursor={{ fill: '#E8F6F5', opacity: 0.6 }}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 12,
                    fontSize: 12,
                    color: CHART.primaryDark,
                  }}
                  formatter={(value) => [formatIDR(Number(value)), 'Total Tercatat']}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                  formatter={() => <span className="text-xs font-semibold text-primary-dark">Penyaluran</span>}
                />
                <Bar dataKey="value" fill={CHART.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Grafik Donut Proporsi Kategori */}
        <Card className="rounded-2xl p-6 bg-white border border-slate-200/70 shadow-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-primary-dark">
              Distribusi Kategori
            </h3>
            <span className="text-xs text-primary-dark/60 font-medium">Persentase (%)</span>
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
                  formatter={(value) => (
                    <span className="text-xs font-medium text-primary-dark mr-2">{value}</span>
                  )}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 12,
                    fontSize: 12,
                    color: CHART.primaryDark,
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
