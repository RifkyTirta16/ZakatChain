import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CreditCard,
  Database,
  Eye,
  RefreshCcw,
} from 'lucide-react';
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
  PaginationBar,
  SectionHeader,
  Skeleton,
  StatCard,
  statusBadge,
} from '../../components/ui';
import { TransactionDetailDrawer } from '../../components/admin/TransactionDetailDrawer';

interface ThreeWayResponse {
  period: string;
  gateway: {
    confirmedTotal: number;
    confirmedCount: number;
    pendingCount: number;
    expiredCount: number;
    failedCount: number;
    mismatchedSessions: Array<{
      payment_session_id: string;
      amount: number;
      payment_status: string;
      donation_id: number | null;
      donation_status: string | null;
      created_at: string;
    }>;
  };
  ledger: {
    totalConfirmedDonations: number;
    totalApprovedConfirmedDistributions: number;
    pendingDistributionsTotal: number;
    availableBalance: number;
    byProgram: Array<{
      campaign_id: number | null;
      title: string;
      status: string;
      donations_confirmed: number;
      distributions_confirmed: number;
      pending_distributions: number;
      balance: number;
      tx_count: number;
    }>;
  };
  onChain: {
    confirmedOnChainCount: number;
    pendingBlockchainCount: number;
    revokedCount: number;
    unreconciledConfirmedCount: number;
    exceptionTransactions: Array<{
      id: number;
      amount: number;
      category: string | null;
      region: string | null;
      proof_status: string | null;
      blockchain_status: string | null;
      tx_hash: string | null;
      timestamp: string;
      open_anomaly_count: number;
    }>;
  };
}

interface ReconciliationLog {
  id: number;
  reconciliation_date: string;
  total_donations: number | null;
  total_distributions: number | null;
  balance: number | null;
  status: string | null;
  notes: string | null;
}

interface PaginatedHistory {
  items: ReconciliationLog[];
  total: number;
  limit: number;
  offset: number;
}

type DrillTab = 'programs' | 'exceptions' | 'history';

export const ReconciliationPage = () => {
  const [{ defaultMonth, defaultYear }] = useState(() => {
    const now = new Date();
    const y = String(now.getFullYear());
    const m = `${y}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return { defaultMonth: m, defaultYear: y };
  });

  const [periodInput, setPeriodInput] = useState('');
  const [appliedPeriod, setAppliedPeriod] = useState('');
  const [activeTab, setActiveTab] = useState<DrillTab>('programs');
  const [historyLimit, setHistoryLimit] = useState(15);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [drawerTxId, setDrawerTxId] = useState<number | null>(null);

  const role = getStoredSessionUser()?.role ?? '';
  const canRun = role === 'ADMIN';

  const threeWayQuery = useQuery<ThreeWayResponse>({
    queryKey: ['reconciliation-three-way', appliedPeriod],
    queryFn: async () => {
      const { data } = await apiClient.get<ThreeWayResponse>('/reconciliation/three-way', {
        params: appliedPeriod ? { period: appliedPeriod } : undefined,
      });
      return data;
    },
  });

  const historyQuery = useQuery<PaginatedHistory>({
    queryKey: ['reconciliation-history', historyLimit, historyOffset],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedHistory>('/reconciliation/history', {
        params: { meta: '1', limit: historyLimit, offset: historyOffset },
      });
      return data;
    },
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const targetPeriod = periodInput.trim() || appliedPeriod || undefined;
      const { data } = await apiClient.post<{
        summary?: { status: string; period: string; balance: number };
      }>('/reconciliation/run', { period: targetPeriod });
      return data;
    },
    onSuccess: (res) => {
      setFeedback({
        type: 'ok',
        text: `Snapshot rekonsiliasi disimpan (${res.summary?.period ?? 'Semua Periode'} · Saldo ${formatIDR(res.summary?.balance ?? 0)}).`,
      });
      void threeWayQuery.refetch();
      void historyQuery.refetch();
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFeedback({ type: 'err', text: apiErr || 'Gagal menjalankan snapshot rekonsiliasi dana.' });
    },
  });

  const applyPeriod = (next: string) => {
    setPeriodInput(next);
    setAppliedPeriod(next);
  };

  if (threeWayQuery.isLoading || historyQuery.isLoading) {
    return (
      <Card>
        <Skeleton lines={9} />
      </Card>
    );
  }

  if (threeWayQuery.isError || historyQuery.isError) {
    return (
      <ErrorState
        message="Gagal memuat data rekonsiliasi 3-arah."
        retry={() => {
          void threeWayQuery.refetch();
          void historyQuery.refetch();
        }}
      />
    );
  }

  const threeWay = threeWayQuery.data;
  const logs = historyQuery.data?.items ?? [];
  const logsTotal = historyQuery.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Rekonsiliasi 3-Arah (QRIS · Buku Besar · On-Chain)"
          subtitle="Mencocokkan nominal gateway pembayaran, buku besar SQLite, dan status hash pada smart contract Ethereum dengan drill-down per program."
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={threeWayQuery.isFetching || historyQuery.isFetching}
          onClick={() => {
            void threeWayQuery.refetch();
            void historyQuery.refetch();
          }}
        >
          <RefreshCcw size={14} /> Segarkan
        </Button>
      </div>

      {/* Period Filter & ADMIN Snapshot Trigger */}
      <Card className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">Filter Periode:</span>
            <button
              type="button"
              onClick={() => applyPeriod('')}
              className={`min-h-[34px] px-3 rounded-[9px] text-xs font-semibold border transition-colors ${
                appliedPeriod === ''
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-forest-dark border-slate-200 hover:bg-mint/60'
              }`}
            >
              Semua Periode
            </button>
            <button
              type="button"
              onClick={() => applyPeriod(defaultMonth)}
              className={`min-h-[34px] px-3 rounded-[9px] text-xs font-semibold border transition-colors ${
                appliedPeriod === defaultMonth
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-forest-dark border-slate-200 hover:bg-mint/60'
              }`}
            >
              Bulan Ini ({defaultMonth})
            </button>
            <button
              type="button"
              onClick={() => applyPeriod(defaultYear)}
              className={`min-h-[34px] px-3 rounded-[9px] text-xs font-semibold border transition-colors ${
                appliedPeriod === defaultYear
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-forest-dark border-slate-200 hover:bg-mint/60'
              }`}
            >
              Tahun {defaultYear}
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedPeriod(periodInput.trim());
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              value={periodInput}
              onChange={(e) => setPeriodInput(e.target.value)}
              placeholder="YYYY-MM atau YYYY"
              aria-label="Filter periode kustom"
              className="min-h-[38px] w-44 rounded-[10px] border border-slate-300 bg-white px-3 text-xs font-mono text-forest-dark outline-none focus:ring-2 focus:ring-primary/25"
            />
            <Button type="submit" variant="secondary" size="sm">
              Terapkan
            </Button>
            {canRun && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={runMutation.isPending}
                onClick={() => {
                  setFeedback(null);
                  runMutation.mutate();
                }}
              >
                Simpan Snapshot
              </Button>
            )}
          </form>
        </div>

        {!canRun && (
          <p className="text-xs text-slate-500">
            Mode baca Auditor: eksekusi penyimpanan snapshot rekonsiliasi hanya tersedia untuk peran <strong>ADMIN</strong>.
          </p>
        )}

        {feedback && (
          <div
            role={feedback.type === 'err' ? 'alert' : 'status'}
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-medium ${
              feedback.type === 'ok'
                ? 'border-primary/25 bg-mint text-forest'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {feedback.type === 'ok' ? (
              <CheckCircle2 size={15} className="text-primary shrink-0" />
            ) : (
              <AlertCircle size={15} className="text-danger shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}
      </Card>

      {/* 3-Way Comparison Layer */}
      {threeWay && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <StatCard
              label="1. Gateway QRIS / DOKU"
              value={formatIDR(threeWay.gateway.confirmedTotal)}
              sublabel={`${threeWay.gateway.confirmedCount} lunas · ${threeWay.gateway.pendingCount} pending · ${threeWay.gateway.mismatchedSessions.length} selisih sesi`}
              icon={<CreditCard size={18} />}
              tone={threeWay.gateway.mismatchedSessions.length > 0 ? 'danger' : 'emerald'}
            />
            <StatCard
              label="2. Buku Besar SQLite"
              value={formatIDR(threeWay.ledger.availableBalance)}
              sublabel={`Masuk ${formatIDR(threeWay.ledger.totalConfirmedDonations)} · Salur valid ${formatIDR(threeWay.ledger.totalApprovedConfirmedDistributions)}`}
              icon={<Database size={18} />}
              tone={threeWay.ledger.availableBalance >= 0 ? 'forest' : 'danger'}
            />
            <StatCard
              label="3. Smart Contract On-Chain"
              value={`${threeWay.onChain.confirmedOnChainCount} Tercatat`}
              sublabel={`${threeWay.onChain.pendingBlockchainCount} tertunda · ${threeWay.onChain.revokedCount} dicabut · ${threeWay.onChain.unreconciledConfirmedCount} belum rekonsiliasi`}
              icon={<Boxes size={18} />}
              tone={
                threeWay.onChain.pendingBlockchainCount > 0 || threeWay.onChain.unreconciledConfirmedCount > 0
                  ? 'gold'
                  : 'emerald'
              }
            />
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100/90 p-1.5 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('programs')}
              className={`min-h-[38px] px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'programs' ? 'bg-white text-forest-dark shadow-xs' : 'text-slate-600 hover:text-forest-dark'
              }`}
            >
              Saldo per Program ({threeWay.ledger.byProgram.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('exceptions')}
              className={`min-h-[38px] px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'exceptions' ? 'bg-white text-forest-dark shadow-xs' : 'text-slate-600 hover:text-forest-dark'
              }`}
            >
              Pengecualian & Selisih ({threeWay.onChain.exceptionTransactions.length + threeWay.gateway.mismatchedSessions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`min-h-[38px] px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'history' ? 'bg-white text-forest-dark shadow-xs' : 'text-slate-600 hover:text-forest-dark'
              }`}
            >
              Riwayat Snapshot ({logsTotal})
            </button>
          </div>

          {activeTab === 'programs' && (
            <Card className="p-0 sm:p-0 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100">
                <h2 className="text-base font-bold text-forest-dark">
                  Rekonsiliasi Saldo per Program ({threeWay.period === 'ALL' ? 'Semua Periode' : threeWay.period})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Program / Pool</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Donasi Lunas</th>
                      <th className="px-4 py-3 font-semibold text-right">Distribusi Valid</th>
                      <th className="px-4 py-3 font-semibold text-right">Tertunda</th>
                      <th className="px-4 py-3 font-semibold text-right">Saldo Pool</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {threeWay.ledger.byProgram.map((p) => {
                      const pst = statusBadge(p.status);
                      return (
                        <tr key={p.campaign_id ?? 'general'} className="hover:bg-cream/60">
                          <td className="px-4 py-3 font-semibold text-forest-dark">{p.title}</td>
                          <td className="px-4 py-3">
                            <Badge tone={pst.tone}>{pst.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-forest-dark tabular-nums whitespace-nowrap">
                            {formatIDR(p.donations_confirmed)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums whitespace-nowrap">
                            {formatIDR(p.distributions_confirmed)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 tabular-nums whitespace-nowrap">
                            {formatIDR(p.pending_distributions)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-forest-dark tabular-nums whitespace-nowrap">
                            {formatIDR(p.balance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'exceptions' && (
            <div className="space-y-5">
              <Card className="p-0 sm:p-0 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100">
                  <h2 className="text-base font-bold text-forest-dark">
                    Transaksi Memerlukan Tindak Lanjut On-Chain / Bukti / Anomali
                  </h2>
                </div>
                {threeWay.onChain.exceptionTransactions.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={<CheckCircle2 size={24} />}
                      title="Tidak ada pengecualian transaksi"
                      description="Seluruh transaksi penyaluran dalam periode ini bersih dan tersinkronisasi."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Laporan</th>
                          <th className="px-4 py-3 font-semibold">Wilayah & Kategori</th>
                          <th className="px-4 py-3 font-semibold text-right">Nominal</th>
                          <th className="px-4 py-3 font-semibold">Status Bukti & Chain</th>
                          <th className="px-4 py-3 font-semibold text-right">Inspeksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {threeWay.onChain.exceptionTransactions.map((tx) => {
                          const pb = statusBadge(tx.proof_status ?? 'PENDING');
                          const cb = statusBadge(tx.blockchain_status ?? 'PENDING_BLOCKCHAIN');
                          return (
                            <tr key={tx.id} className="hover:bg-cream/60">
                              <td className="px-4 py-3">
                                <span className="font-mono font-bold text-forest-dark block">#{tx.id}</span>
                                <span className="text-[11px] text-slate-500">{formatDateTime(tx.timestamp)}</span>
                              </td>
                              <td className="px-4 py-3 text-xs">
                                <p className="font-semibold text-forest-dark">{tx.region || 'Nasional'}</p>
                                <p className="text-slate-500">{tx.category || 'Umum'}</p>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-forest-dark tabular-nums whitespace-nowrap">
                                {formatIDR(Number(tx.amount))}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  <Badge tone={pb.tone}>{pb.label}</Badge>
                                  <Badge tone={cb.tone}>{cb.label}</Badge>
                                  {tx.open_anomaly_count > 0 && (
                                    <Badge tone="danger">{tx.open_anomaly_count} Anomali</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setDrawerTxId(tx.id)}
                                >
                                  <Eye size={13} /> Detail
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <Card className="p-0 sm:p-0 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100">
                  <h2 className="text-base font-bold text-forest-dark">
                    Ketidakcocokan Sesi Gateway vs Tabel Donasi ({threeWay.gateway.mismatchedSessions.length})
                  </h2>
                </div>
                {threeWay.gateway.mismatchedSessions.length === 0 ? (
                  <p className="p-5 text-xs text-slate-500">
                    Seluruh sesi pembayaran aktif selaras dengan catatan tabel donasi.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {threeWay.gateway.mismatchedSessions.map((m) => (
                      <div key={m.payment_session_id} className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <p className="font-mono font-bold text-forest-dark">{m.payment_session_id}</p>
                          <p className="text-slate-500">{formatDateTime(m.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-forest-dark tabular-nums">{formatIDR(m.amount)}</span>
                          <Badge tone="warning">
                            Gateway: {m.payment_status} vs Donasi: {m.donation_status || 'Tidak ada'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === 'history' && (
            <Card className="p-0 sm:p-0 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100">
                <h2 className="text-base font-bold text-forest-dark">Riwayat Snapshot Rekonsiliasi</h2>
              </div>
              {logs.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<Activity size={24} />}
                    title="Belum ada snapshot rekonsiliasi"
                    description="Snapshot akan tampil di sini setelah Administrator menekan tombol Simpan Snapshot."
                  />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                          <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
                          <th className="px-4 py-3 text-right font-semibold">Donasi</th>
                          <th className="px-4 py-3 text-right font-semibold">Distribusi</th>
                          <th className="px-4 py-3 text-right font-semibold">Saldo</th>
                          <th className="px-4 py-3 text-left font-semibold">Status</th>
                          <th className="px-4 py-3 text-left font-semibold">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {logs.map((l) => {
                          const st = statusBadge(l.status ?? 'BALANCED');
                          return (
                            <tr key={l.id} className="hover:bg-cream/60">
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                {formatDateTime(l.reconciliation_date)}
                              </td>
                              <td className="px-4 py-3 text-right text-forest-dark tabular-nums whitespace-nowrap">
                                {formatIDR(l.total_donations ?? 0)}
                              </td>
                              <td className="px-4 py-3 text-right text-forest-dark tabular-nums whitespace-nowrap">
                                {formatIDR(l.total_distributions ?? 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-forest-dark tabular-nums whitespace-nowrap">
                                {formatIDR(Number(l.balance ?? 0))}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Badge tone={st.tone}>{st.label}</Badge>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500">{l.notes || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar
                    total={logsTotal}
                    limit={historyLimit}
                    offset={historyOffset}
                    onOffsetChange={setHistoryOffset}
                    onLimitChange={setHistoryLimit}
                  />
                </>
              )}
            </Card>
          )}
        </>
      )}

      <p className="text-xs text-slate-500 flex items-start gap-2">
        <AlertTriangle size={14} className="text-primary shrink-0 mt-0.5" />
        <span>
          Rekonsiliasi mencatat snapshot buku besar di database dan tidak pernah memindahkan dana nyata. {ON_CHAIN_NOTE}
        </span>
      </p>

      <TransactionDetailDrawer
        transactionId={drawerTxId}
        onClose={() => setDrawerTxId(null)}
        onUpdated={() => void threeWayQuery.refetch()}
      />
    </div>
  );
};

export default ReconciliationPage;
