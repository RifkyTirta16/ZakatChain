import { useQuery } from '@tanstack/react-query';
import { Activity, RefreshCcw, Users } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatIDR, formatDateTime } from '../../utils/format';
import { Badge, Card, EmptyState, ErrorState, Skeleton, ON_CHAIN_NOTE } from '../../components/ui';

interface DashboardStats {
  kpis: {
    totalDonations: number;
    totalDistributed: number;
    totalReports: number;
    verifiedReports: number;
    pendingReports: number;
    openAnomalies: number;
    balance: number;
  };
  networkStatus: { rpc: string; contract: string; status: string };
}

interface ReconciliationLog {
  id: number;
  reconciliation_date: string;
  total_donations: number | null;
  total_distributions: number | null;
  balance: number | null;
  status: string | null;
}

const fetchStats = async (): Promise<DashboardStats> => {
  const { data } = await apiClient.get('/dashboard/stats');
  return data;
};

const fetchReconciliation = async (): Promise<ReconciliationLog[]> => {
  const { data } = await apiClient.get('/reconciliation/history');
  return data;
};

const NETWORK_TONE: Record<string, 'success' | 'gold' | 'coral'> = {
  Healthy: 'success',
  Degraded: 'gold',
  Unknown: 'coral',
};

const AdminHome = () => {
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchStats,
    refetchInterval: 30000,
  });
  const reconQuery = useQuery({
    queryKey: ['reconciliation-history'],
    queryFn: fetchReconciliation,
    refetchInterval: 60000,
  });

  const stats = statsQuery.data;
  const reconLogs = reconQuery.data ?? [];
  const lastRecon = reconLogs[0];
  const loading = statsQuery.isPending || reconQuery.isPending;
  const error = statsQuery.isError || reconQuery.isError;

  const retryAll = () => {
    statsQuery.refetch();
    reconQuery.refetch();
  };

  if (error) {
    return (
      <ErrorState
        message="Gagal memuat ringkasan sistem. Periksa koneksi ke server."
        retry={retryAll}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary-dark mb-1">Ringkasan sistem</h1>
        <p className="text-primary-dark/70">Kesehatan platform secara keseluruhan.</p>
      </div>

      {loading ? (
        <Skeleton lines={8} className="w-full rounded-xl" />
      ) : !stats ? (
        <Card>
          <EmptyState
            icon={<Activity size={36} className="text-primary" />}
            title="Ringkasan belum tersedia"
            description="Data sistem akan muncul setelah server merespons."
            action={
              <button
                onClick={retryAll}
                className="inline-flex items-center min-h-[44px] rounded-full border-2 border-primary px-6 font-bold text-sm text-primary-dark"
              >
                Coba lagi
              </button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-sm text-primary-dark/70 mb-1">Total donasi terkonfirmasi</p>
              <p className="text-xl font-extrabold text-primary-dark">{formatIDR(stats.kpis.totalDonations)}</p>
            </Card>
            <Card>
              <p className="text-sm text-primary-dark/70 mb-1">Total terdistribusi</p>
              <p className="text-xl font-extrabold text-primary-dark">{formatIDR(stats.kpis.totalDistributed)}</p>
            </Card>
            <Card variant={stats.kpis.openAnomalies > 0 ? 'anomaly' : 'default'}>
              <p className="text-sm text-primary-dark/70 mb-1">Anomali terbuka</p>
              <p className="text-xl font-extrabold text-primary-dark">{stats.kpis.openAnomalies} anomali</p>
            </Card>
            <Card>
              <p className="text-sm text-primary-dark/70 mb-1 flex items-center gap-1">
                <Activity size={14} /> Kesehatan chain
              </p>
              <p className="text-lg font-extrabold text-primary-dark mb-2">{stats.networkStatus.status}</p>
              <Badge tone={NETWORK_TONE[stats.networkStatus.status] ?? 'coral'}>
                RPC {stats.networkStatus.rpc}
              </Badge>
            </Card>
          </div>

          <Card>
            <h2 className="font-bold text-primary-dark mb-3 flex items-center gap-2">
              <RefreshCcw size={16} className="text-primary" /> Rekonsiliasi terakhir
            </h2>
            {!lastRecon ? (
              <EmptyState
                icon={<Users size={36} className="text-primary" />}
                title="Belum ada riwayat rekonsiliasi"
                description="Jalankan rekonsiliasi pertama dari menu Rekonsiliasi."
              />
            ) : (
              <div className="space-y-1 text-sm text-primary-dark">
                <p>
                  {formatDateTime(lastRecon.reconciliation_date)} ·{' '}
                  <Badge tone={lastRecon.status === 'BALANCED' ? 'success' : 'gold'}>
                    {lastRecon.status || 'Tidak diketahui'}
                  </Badge>
                </p>
                <p>Selisih: {formatIDR(lastRecon.balance === null ? null : Number(lastRecon.balance))}</p>
              </div>
            )}
            <p className="text-xs text-primary-dark/70 mt-3">{ON_CHAIN_NOTE}</p>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminHome;
