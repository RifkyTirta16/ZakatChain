import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FileSearch, RefreshCcw, ShieldCheck } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime, formatIDR } from '../../utils/format';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ON_CHAIN_NOTE,
  SectionHeader,
  Skeleton,
  StatCard,
} from '../../components/ui';
import type { Transaction } from '../Dashboard';

interface Anomaly {
  id: number;
  transaction_id: number | null;
  type: string;
  reason: string | null;
  priority: string;
  status: string;
  detected_at: string;
  recipient_name: string | null;
  amount: number | null;
}

const AuditorHome = () => {
  const anomalyQuery = useQuery<Anomaly[]>({
    queryKey: ['anomalies'],
    queryFn: async () => {
      const { data } = await apiClient.get<Anomaly[]>('/anomalies');
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30_000,
  });

  const txQuery = useQuery<Transaction[]>({
    queryKey: ['dashboard-transactions'],
    queryFn: async () => {
      const { data } = await apiClient.get<Transaction[]>('/transactions');
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30_000,
  });

  const anomalies = anomalyQuery.data ?? [];
  const transactions = txQuery.data ?? [];
  const openAnomalies = anomalies.filter((a) => a.status === 'OPEN');
  const pendingReview = transactions.filter(
    (t) =>
      t.proof_status === null ||
      ['DRAFT', 'PENDING', 'PENDING_BLOCKCHAIN'].includes(t.proof_status ?? ''),
  );
  const onChain = transactions.filter((t) => t.blockchain_status === 'CONFIRMED');
  const loading = anomalyQuery.isPending || txQuery.isPending;
  const error = anomalyQuery.isError || txQuery.isError;

  if (error) {
    return (
      <ErrorState
        message="Gagal memuat antrean review Auditor. Periksa koneksi ke server."
        retry={() => {
          void anomalyQuery.refetch();
          void txQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Antrean Pengawasan Auditor"
          subtitle="Pantau anomali deteksi sistem, verifikasi bukti penyaluran, dan log audit aktivitas."
        />
        <div className="flex flex-wrap gap-2">
          <Link
            to="/proofs"
            className="inline-flex items-center gap-1.5 min-h-[42px] rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-forest"
          >
            <FileSearch size={15} /> Tinjau Bukti ({pendingReview.length})
          </Link>
          <Link
            to="/anomalies"
            className="inline-flex items-center gap-1.5 min-h-[42px] rounded-[10px] border border-slate-300 bg-white px-4 text-sm font-semibold text-forest-dark hover:bg-mint"
          >
            <AlertTriangle size={15} /> Kelola Anomali
          </Link>
        </div>
      </div>

      {loading ? (
        <Skeleton lines={8} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Anomali Terbuka"
              value={`${openAnomalies.length} temuan`}
              icon={<AlertTriangle size={18} />}
              tone={openAnomalies.length > 0 ? 'danger' : 'emerald'}
            />
            <StatCard
              label="Bukti Menunggu Review"
              value={`${pendingReview.length} laporan`}
              icon={<FileSearch size={18} />}
              tone="gold"
            />
            <StatCard
              label="Hash Tercatat On-Chain"
              value={`${onChain.length} laporan`}
              icon={<ShieldCheck size={18} />}
              tone="forest"
            />
          </div>

          <Card variant={openAnomalies.length > 0 ? 'anomaly' : 'default'} className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-forest-dark">Daftar Anomali Terbuka</h2>
              <Link to="/anomalies" className="text-xs font-semibold text-primary hover:underline">
                Lihat Semua →
              </Link>
            </div>

            {openAnomalies.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={24} />}
                title="Tidak ada anomali terbuka"
                description="Semua temuan telah diselesaikan atau belum ada ketidaksesuaian terdeteksi."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {openAnomalies.slice(0, 6).map((a) => (
                  <div key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-semibold text-forest-dark">
                        #{a.transaction_id ?? '-'} {a.recipient_name || 'Tanpa penerima'} ·{' '}
                        {formatIDR(a.amount === null ? null : Number(a.amount))}
                      </p>
                      <p className="text-xs text-slate-500">
                        {a.type} · {formatDateTime(a.detected_at)}
                      </p>
                    </div>
                    <Badge tone="danger">{a.reason || 'Anomali'}</Badge>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">{ON_CHAIN_NOTE}</p>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link to="/reconciliation" className="block">
              <Card className="hover:shadow-elevated transition-shadow flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-mint text-primary flex items-center justify-center">
                  <RefreshCcw size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-dark">Riwayat Rekonsiliasi</p>
                  <p className="text-xs text-slate-500">Periksa saldo masuk vs penyaluran</p>
                </div>
              </Card>
            </Link>
            <Link to="/export" className="block">
              <Card className="hover:shadow-elevated transition-shadow flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/20 text-amber-900 flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-dark">Ekspor Laporan CSV</p>
                  <p className="text-xs text-slate-500">Unduh arsip transaksi audit</p>
                </div>
              </Card>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditorHome;
