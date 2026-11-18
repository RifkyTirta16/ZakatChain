import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatIDR } from '../utils/format';
import { Card, EmptyState } from './ui';

interface AnalyticsProps {
  data: { category?: string | null; amount: number }[];
}

/** Nilai warna dari DESIGN.md untuk Recharts (SVG butuh string warna, bukan class Tailwind). */
const CHART = {
  primary: '#2BA8A2',
  primaryDark: '#1E8C86',
  gold: '#FFD23F',
  coral: '#EF6C4A',
  sky: '#5DADE2',
  grid: '#E8F6F5',
};

const PIE_COLORS = [CHART.primary, CHART.gold, CHART.coral, CHART.sky, CHART.primaryDark];

const Analytics = ({ data }: AnalyticsProps) => {
  const chartData = useMemo(() => {
    const categoryData = data.reduce<Record<string, number>>((acc, t) => {
      const key = t.category || 'Tanpa kategori';
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

  if (chartData.length === 0) {
    return (
      <Card className="mb-6">
        <EmptyState
          title="Belum ada data penyaluran"
          description="Grafik kategori akan tampil setelah ada transaksi tercatat."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-primary-dark/70 mb-1">Total penyaluran</p>
          <p className="text-2xl font-extrabold text-primary-dark">{formatIDR(totalValue)}</p>
        </Card>
        <Card>
          <p className="text-sm text-primary-dark/70 mb-1">Jumlah kategori</p>
          <p className="text-2xl font-extrabold text-primary-dark">{chartData.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-primary-dark/70 mb-1">Kategori terbesar</p>
          <p className="text-lg font-extrabold text-primary-dark truncate">
            {[...chartData].sort((a, b) => b.value - a.value)[0].name}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-base font-bold text-primary-dark mb-4">Penyaluran per Kategori (Rp)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" stroke={CHART.primaryDark} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis
                  stroke={CHART.primaryDark}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatIDR(v)}
                />
                <Tooltip
                  cursor={{ fill: CHART.grid }}
                  contentStyle={{ backgroundColor: '#FFFFFF', border: `1px solid ${CHART.grid}`, borderRadius: 12, color: CHART.primaryDark }}
                  formatter={(value) => [formatIDR(Number(value)), 'Total']}
                />
                <Bar dataKey="value" fill={CHART.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="text-base font-bold text-primary-dark mb-4">Distribusi Kategori (%)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span style={{ color: CHART.primaryDark, fontSize: 12 }}>{value}</span>}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', border: `1px solid ${CHART.grid}`, borderRadius: 12, color: CHART.primaryDark }}
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
