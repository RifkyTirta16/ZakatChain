import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  Eye,
  FileSearch,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import apiClient from '../../utils/api';
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
  statusBadge,
} from '../../components/ui';
import { TransactionDetailDrawer } from '../../components/admin/TransactionDetailDrawer';
import { PaymentWebhookMonitor } from '../../components/admin/PaymentWebhookMonitor';

interface AuditorOverviewPayload {
  kpis: {
    totalDonations: number;
    totalDistributed: number;
    totalReports: number;
    verifiedReports: number;
    pendingProofCount: number;
    openAnomalyCount: number;
    criticalAnomalyCount: number;
  };
  priorityQueue: {
    pendingProofs: Array<{
      id: number;
      recipient_name: string | null;
      amount: number;
      category: string | null;
      region: string | null;
      proof_url: string | null;
      proof_status: string | null;
      timestamp: string;
    }>;
    openAnomalies: Array<{
      id: number;
      transaction_id: number | null;
      type: string;
      reason: string | null;
      priority: string;
      detected_at: string;
      status: string;
      recipient_name: string | null;
      amount: number | null;
    }>;
  };
  recentAuditLogs: Array<{
    id: number;
    actor_username: string | null;
    action: string;
    entity_type: string;
    entity_id: number | null;
    new_value: string | null;
    timestamp: string;
  }>;
}

interface ReconciliationHistoryResponse {
  items: Array<{
    id: number;
    reconciliation_date: string;
    balance: number | null;
    status: string | null;
  }>;
}

const AuditorHome = () => {
  const [viewMode, setViewMode] = useState<'overview' | 'payments'>('overview');
  const [drawerTx, setDrawerTx] = useState<{ id: number; tab: 'summary' | 'proof' | 'audit' } | null>(null);

  const overviewQuery = useQuery<AuditorOverviewPayload>({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const { data } = await apiClient.get<AuditorOverviewPayload>('/admin/overview');
      return data;
    },
    refetchInterval: 30_000,
  });

  const reconQuery = useQuery<ReconciliationHistoryResponse>({
    queryKey: ['auditor-home-recon'],
    queryFn: async () => {
      const { data } = await apiClient.get<ReconciliationHistoryResponse>('/reconciliation/history', {
        params: { meta: '1', limit: 1, offset: 0 },
      });
      return data;
    },
  });

  if (overviewQuery.isError) {
    return (
      <ErrorState
        message="Gagal memuat antrean review Auditor. Periksa koneksi ke server."
        retry={() => {
          void overviewQuery.refetch();
          void reconQuery.refetch();
        }}
      />
    );
  }

  const overview = overviewQuery.data;
  const lastRecon = reconQuery.data?.items?.[0];
  const lastReconBadge = lastRecon?.status ? statusBadge(lastRecon.status) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Workspace Audit Independen"
          subtitle="Pemeriksaan bukti terunggah, tindak lanjut anomali, monitor pembayaran QRIS, dan jejak audit."
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={viewMode === 'overview' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('overview')}
          >
            <FileSearch size={14} /> Antrean Audit
          </Button>
          <Button
            type="button"
            variant={viewMode === 'payments' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('payments')}
          >
            <CreditCard size={14} /> Monitor Pembayaran
          </Button>
          <Link
            to="/proofs"
            className="inline-flex items-center gap-1.5 min-h-[38px] rounded-[10px] bg-gradient-to-b from-gold-light to-gold px-4 text-xs sm:text-sm font-semibold text-forest-dark border border-gold-dark/25"
          >
            <FileSearch size={14} /> Verifikasi Bukti ({overview?.kpis.pendingProofCount ?? 0})
          </Link>
        </div>
      </div>

      {viewMode === 'payments' ? (
        <PaymentWebhookMonitor />
      ) : overviewQuery.isPending || !overview ? (
        <Skeleton lines={8} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Anomali Terbuka"
              value={`${overview.kpis.openAnomalyCount} temuan`}
              sublabel={`${overview.kpis.criticalAnomalyCount} prioritas kritis`}
              icon={<AlertTriangle size={18} />}
              tone={overview.kpis.openAnomalyCount > 0 ? 'danger' : 'emerald'}
            />
            <StatCard
              label="Bukti Menunggu Tinjauan"
              value={`${overview.kpis.pendingProofCount} laporan`}
              sublabel="Menunggu verifikasi auditor"
              icon={<FileSearch size={18} />}
              tone="gold"
            />
            <StatCard
              label="Laporan On-Chain Valid"
              value={`${overview.kpis.verifiedReports} laporan`}
              sublabel={`Dari ${overview.kpis.totalReports} distribusi tercatat`}
              icon={<ShieldCheck size={18} />}
              tone="forest"
            />
            <StatCard
              label="Rekonsiliasi Terakhir"
              value={lastReconBadge ? lastReconBadge.label : 'Belum Ada'}
              sublabel={
                lastRecon
                  ? `${formatIDR(Number(lastRecon.balance ?? 0))} · ${formatDateTime(lastRecon.reconciliation_date)}`
                  : 'Menunggu eksekusi Administrator'
              }
              icon={<RefreshCcw size={18} />}
              tone={lastRecon?.status === 'BALANCED' ? 'emerald' : lastRecon ? 'danger' : 'neutral'}
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
                  <p className="text-xs text-slate-500">Lihat berkas & putuskan</p>
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
                  <p className="text-sm font-bold text-forest-dark">Rekonsiliasi 3-Arah</p>
                  <p className="text-xs text-slate-500">QRIS vs Ledger vs Chain</p>
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
            <Card
              variant={overview.priorityQueue.openAnomalies.length > 0 ? 'anomaly' : 'default'}
              className="lg:col-span-7 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-forest-dark">Daftar Anomali Terbuka</h2>
                <Link to="/anomalies" className="text-xs font-semibold text-primary hover:underline">
                  Lihat Semua →
                </Link>
              </div>

              {overview.priorityQueue.openAnomalies.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 size={24} />}
                  title="Tidak ada anomali terbuka"
                  description="Semua temuan telah diselesaikan atau belum ada ketidaksesuaian terdeteksi."
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {overview.priorityQueue.openAnomalies.slice(0, 6).map((a) => {
                    const pr = statusBadge(a.priority);
                    return (
                      <div key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-semibold text-forest-dark">
                            #{a.transaction_id ?? '-'} {a.recipient_name || 'Tanpa penerima'} ·{' '}
                            {formatIDR(a.amount === null ? null : Number(a.amount))}
                          </p>
                          <p className="text-xs text-slate-500">
                            {a.reason || a.type} · {formatDateTime(a.detected_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge tone={pr.tone}>{pr.label}</Badge>
                          {a.transaction_id && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setDrawerTx({ id: a.transaction_id as number, tab: 'audit' })}
                            >
                              <Eye size={12} /> Inspeksi
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                  <Link
                    to="/export"
                    className="text-xs font-semibold text-slate-600 hover:text-primary inline-flex items-center gap-1"
                  >
                    <Download size={12} /> CSV
                  </Link>
                  <Link to="/audit" className="text-xs font-semibold text-primary hover:underline">
                    Semua →
                  </Link>
                </div>
              </div>

              {overview.recentAuditLogs.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Belum ada entri log audit tercatat.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {overview.recentAuditLogs.slice(0, 6).map((entry) => (
                    <div key={entry.id} className="py-2.5 text-xs space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-forest-dark">{entry.action}</span>
                        <span className="text-slate-400">{formatDateTime(entry.timestamp)}</span>
                      </div>
                      <p className="text-slate-600">
                        Oleh <strong>{entry.actor_username || 'sistem'}</strong> ·{' '}
                        {entry.entity_type === 'TRANSACTION' && entry.entity_id ? (
                          <button
                            type="button"
                            onClick={() => setDrawerTx({ id: entry.entity_id as number, tab: 'audit' })}
                            className="font-semibold text-primary hover:underline"
                          >
                            TRANSACTION #{entry.entity_id}
                          </button>
                        ) : (
                          `${entry.entity_type} #${entry.entity_id ?? '-'}`
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      <TransactionDetailDrawer
        transactionId={drawerTx?.id ?? null}
        initialTab={drawerTx?.tab ?? 'summary'}
        onClose={() => setDrawerTx(null)}
        onUpdated={() => void overviewQuery.refetch()}
      />
    </div>
  );
};

export default AuditorHome;
