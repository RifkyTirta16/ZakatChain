import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, FileSearch } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatIDR, formatDateTime } from '../../utils/format';
import { Badge, Card, EmptyState, ErrorState, Skeleton, ON_CHAIN_NOTE } from '../../components/ui';
import type { Transaction } from '../Dashboard';

interface Anomaly {
  id: number;
  transaction_id: number | null;
  reason: string | null;
  status: string;
  detected_at: string;
  recipient_name: string | null;
  amount: number | null;
}

const fetchAnomalies = async (): Promise<Anomaly[]> => {
  const { data } = await apiClient.get('/anomalies');
  return data;
};

const fetchTransactions = async (): Promise<Transaction[]> => {
  const { data } = await apiClient.get('/transactions');
  return data;
};

const AuditorHome = () => {
  const anomalyQuery = useQuery({
    queryKey: ['anomalies'],
    queryFn: fetchAnomalies,
    refetchInterval: 30000,
  });
  const txQuery = useQuery({
    queryKey: ['dashboard-transactions'],
    queryFn: fetchTransactions,
    refetchInterval: 30000,
  });

  const anomalies = anomalyQuery.data ?? [];
  const transactions = txQuery.data ?? [];
  const openAnomalies = anomalies.filter((a) => a.status === 'OPEN');
  const pendingReview = transactions.filter(
    (t) => !['CONFIRMED', 'PAID'].includes(t.blockchain_status ?? '') && !['REJECTED', 'ANOMALY'].includes(t.proof_status ?? '')
  );
  const onChain = transactions.filter((t) => t.blockchain_status === 'CONFIRMED');
  const loading = anomalyQuery.isPending || txQuery.isPending;
  const error = anomalyQuery.isError || txQuery.isError;

  const retryAll = () => {
    anomalyQuery.refetch();
    txQuery.refetch();
  };

  if (error) {
    return (
      <ErrorState
        message="Gagal memuat antrean review. Periksa koneksi ke server."
        retry={retryAll}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary-dark mb-1">Antrean review</h1>
        <p className="text-primary-dark/70">Bukti distribusi yang menunggu persetujuan atau penolakan.</p>
      </div>

      {loading ? (
        <Skeleton lines={6} className="w-full rounded-xl" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card variant={openAnomalies.length > 0 ? 'anomaly' : 'default'}>
              <p className="text-sm text-primary-dark/70 mb-1">Anomali terbuka</p>
              <p className="text-xl font-extrabold text-primary-dark">{openAnomalies.length} anomali</p>
            </Card>
            <Card>
              <p className="text-sm text-primary-dark/70 mb-1">Menunggu review</p>
              <p className="text-xl font-extrabold text-primary-dark">{pendingReview.length} laporan</p>
            </Card>
            <Card>
              <p className="text-sm text-primary-dark/70 mb-1">Hash tercatat on-chain</p>
              <p className="text-xl font-extrabold text-primary-dark">{onChain.length} laporan</p>
            </Card>
          </div>

          <Card variant={openAnomalies.length > 0 ? 'anomaly' : 'default'}>
            <h2 className="font-bold text-primary-dark mb-3">Anomali terbuka</h2>
            {openAnomalies.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle size={36} className="text-primary" />}
                title="Belum ada anomali terbuka"
                description="Semua anomali sudah ditindaklanjuti."
              />
            ) : (
              <div className="divide-y divide-dashed">
                {openAnomalies.slice(0, 5).map((a) => (
                  <div key={a.id} className="py-3 flex items-center justify-between gap-2 text-sm">
                    <span className="text-primary-dark">
                      #{a.transaction_id ?? '-'} {a.recipient_name || 'Tanpa penerima'} ·{' '}
                      {formatIDR(a.amount === null ? null : Number(a.amount))} ·{' '}
                      {formatDateTime(a.detected_at)}
                    </span>
                    <Badge tone="coral">{a.reason || 'Anomali'}</Badge>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-primary-dark/70 mt-3">{ON_CHAIN_NOTE}</p>
          </Card>
        </>
      )}

      <Link
        to="/anomalies"
        className="inline-flex items-center min-h-[44px] rounded-full bg-gradient-to-br from-gold to-gold-light px-6 font-bold text-sm text-primary-dark shadow-gold-glow outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <FileSearch size={16} className="mr-2" /> Tinjau semua anomali
      </Link>
    </div>
  );
};

export default AuditorHome;
