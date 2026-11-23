import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertCircle, RefreshCcw } from 'lucide-react';
import apiClient from '../../utils/api';
import { getStoredSessionUser } from '../../components/layout/navConfig';
import { formatDateTime, formatIDR } from '../../utils/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ON_CHAIN_NOTE,
  SectionHeader,
  Skeleton,
  StatCard,
} from '../../components/ui';

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
  const [actionError, setActionError] = useState('');

  const role = getStoredSessionUser()?.role ?? '';
  const canRun = role === 'ADMIN';

  const { data, isLoading, error, refetch } = useQuery<ReconciliationLog[]>({
    queryKey: ['reconciliation-history'],
    queryFn: async () => {
      const { data } = await apiClient.get<ReconciliationLog[]>('/reconciliation/history');
      return Array.isArray(data) ? data : [];
    },
  });

  const logs = data ?? [];
  const last = logs[0];

  const runReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setRunning(true);
    try {
      await apiClient.post('/reconciliation/run', { period: period.trim() || undefined });
      setPeriod('');
      void refetch();
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } } };
      setActionError(e2.response?.data?.error || 'Gagal menjalankan rekonsiliasi dana.');
    } finally {
      setRunning(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <Skeleton lines={8} />
      </Card>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="Gagal memuat riwayat rekonsiliasi dana."
        retry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Rekonsiliasi Keuangan Zakat"
          subtitle="Membandingkan total donasi masuk terkonfirmasi dengan total penyaluran terverifikasi."
        />
        <Button variant="secondary" size="sm" onClick={() => void refetch()}>
          <RefreshCcw size={14} /> Segarkan
        </Button>
      </div>

      {last ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Donasi"
              value={formatIDR(last.total_donations ?? 0)}
              tone="emerald"
            />
            <StatCard
              label="Total Distribusi"
              value={formatIDR(last.total_distributions ?? 0)}
              tone="gold"
            />
            <StatCard
              label="Saldo Net"
              value={formatIDR(Number(last.balance ?? 0))}
              sublabel={`${last.status || '-'} · ${formatDateTime(last.reconciliation_date)}`}
              tone={Number(last.balance || 0) >= 0 ? 'forest' : 'danger'}
            />
          </div>
          {last.notes && (
            <Card className="py-3.5 text-xs text-slate-600">
              <strong className="text-forest-dark">Catatan terakhir:</strong> {last.notes}
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Activity size={24} />}
            title="Belum ada riwayat rekonsiliasi"
            description="Snapshot rekonsiliasi pertama akan tampil di sini setelah dijalankan oleh Administrator."
          />
        </Card>
      )}

      {canRun ? (
        <Card className="space-y-3">
          <h2 className="text-base font-bold text-forest-dark">Jalankan Rekonsiliasi Baru (Khusus ADMIN)</h2>
          {actionError && (
            <div role="alert" className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="text-danger shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          <form onSubmit={runReconciliation} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="Periode (opsional, mis. November 2026)"
              className="min-h-[44px] bg-white border border-slate-300 px-3.5 py-2 rounded-[10px] text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary w-full sm:w-72"
            />
            <Button type="submit" variant="primary" loading={running}>
              Jalankan Rekonsiliasi
            </Button>
          </form>
          <p className="text-xs text-slate-500">
            Rekonsiliasi mencatat snapshot saldo di database; tidak pernah memindahkan dana nyata. {ON_CHAIN_NOTE}
          </p>
        </Card>
      ) : (
        <Card className="bg-cream border-slate-200 text-xs text-slate-600">
          Mode baca Auditor: eksekusi rekonsiliasi baru hanya dapat dilakukan oleh peran <strong>ADMIN</strong>.
        </Card>
      )}

      {logs.length > 1 && (
        <Card className="p-0 sm:p-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-forest-dark">Riwayat Snapshot Rekonsiliasi</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
                  <th className="px-4 py-3 text-right font-semibold">Donasi</th>
                  <th className="px-4 py-3 text-right font-semibold">Distribusi</th>
                  <th className="px-4 py-3 text-right font-semibold">Saldo</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.slice(1).map((l) => (
                  <tr key={l.id} className="hover:bg-cream/60">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateTime(l.reconciliation_date)}</td>
                    <td className="px-4 py-3 text-right text-forest-dark tabular-nums">{formatIDR(l.total_donations ?? 0)}</td>
                    <td className="px-4 py-3 text-right text-forest-dark tabular-nums">{formatIDR(l.total_distributions ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-forest-dark tabular-nums">{formatIDR(Number(l.balance ?? 0))}</td>
                    <td className="px-4 py-3">
                      <Badge tone={l.status === 'BALANCED' ? 'success' : 'gold'}>{l.status}</Badge>
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
