import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatIDR, formatDateTime } from '../../utils/format';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { ON_CHAIN_NOTE } from '../../components/ui/badgeStatus';

interface ReconciliationLog {
  id: number;
  reconciliation_date: string;
  total_donations: number | null;
  total_distributions: number | null;
  balance: number | null;
  status: string | null;
  notes: string | null;
}

export const ReconciliationPage = () => {
  const [period, setPeriod] = useState('');
  const [running, setRunning] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<ReconciliationLog[]>({
    queryKey: ['reconciliation-history'],
    queryFn: async () => {
      const { data } = await apiClient.get<ReconciliationLog[]>('/reconciliation/history');
      return data;
    },
  });

  const logs = data ?? [];
  const last = logs[0];

  const runReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    try {
      await apiClient.post('/reconciliation/run', { period: period.trim() || undefined });
      refetch();
    } finally {
      setRunning(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl p-6">
        <Skeleton lines={6} className="w-full rounded-xl" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl p-6">
        <ErrorState message="Gagal memuat riwayat rekonsiliasi." retry={() => { refetch(); }} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary-dark mb-1">Rekonsiliasi</h1>
        <p className="text-primary-dark/70">Cocokkan total donasi terkonfirmasi dengan distribusi terverifikasi.</p>
      </div>

      {last ? (
        <Card>
          <h2 className="font-bold text-primary-dark mb-3 flex items-center gap-2">
            <Activity size={16} className="text-primary" /> Rekonsiliasi Terakhir
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="p-3 bg-primary-bg rounded-xl border border-primary-bg">
              <p className="text-xs text-primary-dark/70 uppercase tracking-wider mb-1">Total Donasi</p>
              <p className="text-xl font-extrabold text-primary-dark">{formatIDR(last.total_donations ?? 0)}</p>
            </div>
            <div className="p-3 bg-gold/10 rounded-xl border border-gold/30">
              <p className="text-xs text-primary-dark/70 uppercase tracking-wider mb-1">Total Distribusi</p>
              <p className="text-xl font-extrabold text-primary-dark">{formatIDR(last.total_distributions ?? 0)}</p>
            </div>
            <div className="p-3 rounded-xl border">
              <p className="text-xs text-primary-dark/70 uppercase tracking-wider mb-1">Saldo Net</p>
              <p className={`text-xl font-extrabold ${Number(last.balance || 0) >= 0 ? 'text-primary-dark' : 'text-coral-dark'}`}>
                {formatIDR(Number(last.balance ?? 0))}
              </p>
            </div>
          </div>
          <div className="p-3 bg-cream rounded-xl border border-cream">
            <p className="text-xs text-primary-dark/70 mb-1">Status</p>
            <p className="text-sm font-bold text-primary-dark">{last.status || 'Tidak diketahui'}</p>
            <p className="text-xs text-primary-dark/70 mt-1">{formatDateTime(last.reconciliation_date)}</p>
            {last.notes && <p className="text-xs text-primary-dark/70 mt-1">{last.notes}</p>}
          </div>
          <p className="text-xs text-primary-dark/70 mt-3">{ON_CHAIN_NOTE}</p>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<Activity size={36} className="text-primary" />}
            title="Belum ada riwayat rekonsiliasi"
            description="Jalankan rekonsiliasi pertama untuk mencetak saldo net platform."
          />
        </Card>
      )}

      <Card>
        <h2 className="font-bold text-primary-dark mb-3">Jalankan Rekonsiliasi</h2>
        <form onSubmit={runReconciliation} className="flex flex-col sm:flex-row gap-3 items-end">
          <input
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="Perioda (opsional, mis. November 2026)"
            className="bg-cream border border-primary-bg px-3 py-2 rounded-xl text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary w-full sm:w-64"
          />
          <Button type="submit" variant="primary" loading={running} disabled={running}>
            Jalankan Rekonsiliasi
          </Button>
        </form>
        <p className="text-xs text-primary-dark/70 mt-3">
          Rekonsiliasi hanya dicatat sebagai snapshot hash-terbukti; tidak pernah mengubah dana di dunia nyata.
        </p>
      </Card>

      {logs.length > 1 && (
        <Card>
          <h2 className="font-bold text-primary-dark mb-3">Riwayat</h2>
          <div className="overflow-x-auto rounded-xl border border-primary-bg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-bg text-primary-dark text-xs">
                  <th className="px-3 py-3 text-left font-bold">Tanggal</th>
                  <th className="px-3 py-3 text-right font-bold">Donasi</th>
                  <th className="px-3 py-3 text-right font-bold">Distribusi</th>
                  <th className="px-3 py-3 text-right font-bold">Saldo</th>
                  <th className="px-3 py-3 text-left font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(1).map((l) => (
                  <tr key={l.id} className="border-t border-primary-bg hover:bg-primary-bg/40 transition-colors">
                    <td className="px-3 py-3 text-primary-dark/70 whitespace-nowrap">{formatDateTime(l.reconciliation_date)}</td>
                    <td className="px-3 py-3 text-right text-primary-dark">{formatIDR(l.total_donations ?? 0)}</td>
                    <td className="px-3 py-3 text-right text-primary-dark">{formatIDR(l.total_distributions ?? 0)}</td>
                    <td className="px-3 py-3 text-right text-primary-dark">{formatIDR(Number(l.balance ?? 0))}</td>
                    <td className="px-3 py-3">
                      <Badge tone={l.status === 'BALANCED' ? 'success' : 'gold'} className="text-xs">{l.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ReconciliationPage;
