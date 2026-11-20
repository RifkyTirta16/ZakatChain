import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSearch,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
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

interface AuditEntry {
  id: number;
  actor_username: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  new_value: string | null;
  timestamp: string;
}

interface ReconciliationLog {
  id: number;
  reconciliation_date: string;
  total_donations: number | null;
  total_distributions: number | null;
  balance: number | null;
  status: string | null;
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

  const auditQuery = useQuery<AuditEntry[]>({
    queryKey: ['auditor-home-audit'],
    queryFn: async () => {
      const { data } = await apiClient.get<AuditEntry[]>('/audit');
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30_000,
  });

  const reconQuery = useQuery<ReconciliationLog[]>({
    queryKey: ['auditor-home-recon'],
    queryFn: async () => {
      const { data } = await apiClient.get<ReconciliationLog[]>('/reconciliation/history');
      return Array.isArray(data) ? data : [];
    },
  });

  const anomalies = anomalyQuery.data ?? [];
  const transactions = txQuery.data ?? [];
  const auditLogs = auditQuery.data ?? [];
  const lastRecon = reconQuery.data?.[0];

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
          void auditQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Workspace Audit Independen"
          subtitle="Pemeriksaan berkas bukti (/uploads terproteksi), pemindaian anomali, jejak audit aktivitas, dan ekspor kepatuhan."
        />
        <div className="flex flex-wrap gap-2">
          <Link
            to="/proofs"
            className="inline-flex items-center gap-1.5 min-h-[42px] rounded-[10px] bg-gradient-to-b from-primary-light to-primary px-4 text-sm font-semibold text-white hover:to-forest shadow-teal-glow"
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Anomali Terbuka"
              value={`${openAnomalies.length} temuan`}
              sublabel={`Total ${anomalies.length} riwayat`}
              icon={<AlertTriangle size={18} />}
              tone={openAnomalies.length > 0 ? 'danger' : 'emerald'}
            />
            <StatCard
              label="Bukti Menunggu Review"
              value={`${pendingReview.length} laporan`}
              sublabel="Perlu persetujuan auditor"
              icon={<FileSearch size={18} />}
              tone="gold"
            />
            <StatCard
              label="Hash Tercatat On-Chain"
              value={`${onChain.length} laporan`}
              sublabel={`Dari ${transactions.length} distribusi`}
              icon={<ShieldCheck size={18} />}
              tone="forest"
            />
            <StatCard
              label="Entri Log Audit"
              value={`${auditLogs.length} catatan`}
              sublabel={lastRecon ? `Rekonsiliasi: ${lastRecon.status}` : 'Belum ada rekonsiliasi'}
              icon={<ScrollText size={18} />}
              tone="neutral"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/proofs" className="block">
              <Card className="hover:border-primary/40 transition-colors flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-mint border border-primary/15 text-primary flex items-center justify-center shrink-0">
                  <FileSearch size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-dark">Verifikasi Bukti</p>
                  <p className="text-xs text-slate-500">Lihat dokumen & setujui</p>
                </div>
              </Card>
            </Link>
            <Link to="/audit" className="block">
              <Card className="hover:border-primary/40 transition-colors flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-forest/10 border border-forest/15 text-forest flex items-center justify-center shrink-0">
                  <ScrollText size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-dark">Log Audit</p>
                  <p className="text-xs text-slate-500">Jejak perubahan sistem</p>
                </div>
              </Card>
            </Link>
            <Link to="/reconciliation" className="block">
              <Card className="hover:border-primary/40 transition-colors flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-mint border border-primary/15 text-primary flex items-center justify-center shrink-0">
                  <RefreshCcw size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-dark">Rekonsiliasi (Pantau)</p>
                  <p className="text-xs text-slate-500">Saldo masuk vs distribusi</p>
                </div>
              </Card>
            </Link>
            <Link to="/mustahik" className="block">
              <Card className="hover:border-gold/50 transition-colors flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 text-amber-900 flex items-center justify-center shrink-0">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-dark">Audit Mustahik & CSV</p>
                  <p className="text-xs text-slate-500">Inspeksi penerima & arsip</p>
                </div>
              </Card>
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <Card variant={openAnomalies.length > 0 ? 'anomaly' : 'default'} className="lg:col-span-7 space-y-4">
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

            <Card className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-forest-dark flex items-center gap-2">
                  <ScrollText size={16} className="text-primary" /> Log Audit Terbaru
                </h2>
                <div className="flex items-center gap-3">
                  <Link to="/export" className="text-xs font-semibold text-slate-600 hover:text-primary inline-flex items-center gap-1">
                    <Download size={12} /> CSV
                  </Link>
                  <Link to="/audit" className="text-xs font-semibold text-primary hover:underline">
                    Semua →
                  </Link>
                </div>
              </div>

              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Belum ada entri log audit tercatat.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {auditLogs.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="py-2.5 text-xs space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-forest-dark">{entry.action}</span>
                        <span className="text-slate-400">{formatDateTime(entry.timestamp)}</span>
                      </div>
                      <p className="text-slate-600">
                        Oleh <strong>{entry.actor_username || 'sistem'}</strong> · {entry.entity_type} #{entry.entity_id ?? '-'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditorHome;
