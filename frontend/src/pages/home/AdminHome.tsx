import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Cpu,
  CreditCard,
  Eye,
  FileSearch,
  HeartHandshake,
  History,
  LockOpen,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import apiClient from '../../utils/api';
import { formatDateTime, formatIDR, formatNumber, shortHash } from '../../utils/format';
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
import { NetworkBadge } from '../../components/ethereum';
import { TransactionDetailDrawer } from '../../components/admin/TransactionDetailDrawer';
import { PaymentWebhookMonitor } from '../../components/admin/PaymentWebhookMonitor';

type AdminTab = 'command' | 'payments' | 'blockchain' | 'audit';

interface AdminOverviewResponse {
  kpis: {
    totalDonations: number;
    totalDistributed: number;
    availableBalance: number;
    totalReports: number;
    verifiedReports: number;
    pendingBlockchainCount: number;
    pendingProofCount: number;
    openAnomalyCount: number;
    criticalAnomalyCount: number;
    lockedUserCount: number;
    totalUsers: number;
    activeCampaignsCount: number;
  };
  programBreakdown: Array<{
    campaign_id: number | null;
    title: string;
    status: string;
    target_amount: number;
    collected_amount: number;
    distributed_amount: number;
    pending_distribution_amount: number;
    available_balance: number;
    donor_count: number;
    tx_count: number;
  }>;
  cashflowSeries: Array<{
    bucket: string;
    donations_amount: number;
    distributions_amount: number;
  }>;
  priorityQueue: {
    pendingProofs: Array<{
      id: number;
      recipient_name: string | null;
      amount: number;
      category: string | null;
      region: string | null;
      proof_url: string | null;
      proof_status: string | null;
      blockchain_status: string | null;
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
    pendingBlockchain: Array<{
      id: number;
      recipient_name: string | null;
      amount: number;
      category: string | null;
      region: string | null;
      proof_status: string | null;
      blockchain_status: string | null;
      audit_hash: string | null;
      timestamp: string;
    }>;
    attentionPayments: Array<{
      id: number;
      payment_session_id: string;
      donor_name: string | null;
      amount: number;
      program_id: string | null;
      status: string;
      provider_tx_id: string | null;
      created_at: string;
      expires_at: string | null;
    }>;
    lockedUsers: Array<{
      id: number;
      username: string;
      role: string;
      failed_login_attempts: number;
      locked_until: string | null;
    }>;
  };
  paymentSummary: {
    totalCount: number;
    confirmedCount: number;
    pendingCount: number;
    expiredCount: number;
    failedCount: number;
    confirmedVolume: number;
    dokuCount: number;
    sandboxCount: number;
  };
  recentAuditLogs: Array<{
    id: number;
    actor_id: number | null;
    actor_username: string | null;
    action: string;
    entity_type: string;
    entity_id: number | null;
    old_value: string | null;
    new_value: string | null;
    timestamp: string;
  }>;
  blockchain: {
    rpc: string;
    contract: string;
    status: string;
    chainId: number | null;
    networkName: string;
    contractAddress: string;
    blockNumber: number | null;
    latestBlockTimestamp: string | null;
    rpcLatencyMs: number | null;
    contractOwner: string | null;
    signerAddress: string | null;
    signerBalanceEth: string | null;
    signerMatchesOwner: boolean | null;
    pendingQueueCount: number;
    confirmedCount: number;
    revokedCount: number;
  };
}

const CHART_COLORS = {
  inflow: '#047857',
  outflow: '#C9A45C',
  grid: '#E2E8F0',
  axis: '#475569',
};

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: 'command', label: 'Command Center & Antrean' },
  { id: 'payments', label: 'Pembayaran & Webhook' },
  { id: 'blockchain', label: 'Telemetri Blockchain' },
  { id: 'audit', label: 'Jejak Audit Terbaru' },
];

const AdminHome = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('command');
  const [drawerTx, setDrawerTx] = useState<{ id: number; tab: 'summary' | 'proof' | 'audit' } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const overviewQuery = useQuery<AdminOverviewResponse>({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const { data } = await apiClient.get<AdminOverviewResponse>('/admin/overview');
      return data;
    },
    refetchInterval: 30_000,
  });

  const batchReconcileMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ attempted: number; confirmed: number; failed: number }>(
        '/transactions/reconcile-batch',
        { limit: 10 }
      );
      return data;
    },
    onSuccess: (res) => {
      setFeedback({
        type: res.failed > 0 ? 'err' : 'ok',
        text: `Rekonsiliasi massal selesai: ${res.confirmed} dari ${res.attempted} laporan tercatat ke Ethereum${res.failed > 0 ? `, ${res.failed} gagal` : ''}.`,
      });
      void overviewQuery.refetch();
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFeedback({ type: 'err', text: apiErr || 'Gagal menjalankan rekonsiliasi massal ke Ethereum.' });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (userId: number) => {
      const { data } = await apiClient.patch<{ user: { username: string } }>(`/users/${userId}/unlock`);
      return data;
    },
    onSuccess: (res) => {
      setFeedback({
        type: 'ok',
        text: `Kunci login akun ${res.user.username} berhasil dibuka dan dicatat di Log Audit.`,
      });
      void overviewQuery.refetch();
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFeedback({ type: 'err', text: apiErr || 'Gagal membuka kunci akun.' });
    },
  });

  if (overviewQuery.isError) {
    return (
      <ErrorState
        message="Gagal memuat Command Center Administrator. Pastikan server backend aktif."
        retry={() => void overviewQuery.refetch()}
      />
    );
  }

  const overview = overviewQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <SectionHeader
          title="Command Center Administrator"
          subtitle="Kendali terpadu penghimpunan QRIS, antrean prioritas SLA, rekonsiliasi per program, keamanan akun, dan telemetri smart contract."
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <NetworkBadge compact />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={overviewQuery.isFetching}
            onClick={() => void overviewQuery.refetch()}
          >
            <RefreshCw size={14} /> Segarkan Data
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'err' ? 'alert' : 'status'}
          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center gap-2 font-medium ${
            feedback.type === 'ok'
              ? 'bg-mint border-primary/25 text-forest'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 size={16} className="text-primary shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-danger shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {overviewQuery.isPending ? (
        <Skeleton lines={10} />
      ) : !overview ? (
        <EmptyState
          icon={<Activity size={24} />}
          title="Data ringkasan belum tersedia"
          description="Muat ulang halaman atau periksa koneksi API /admin/overview."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Zakat Terhimpun"
              value={formatIDR(overview.kpis.totalDonations)}
              sublabel={`${overview.paymentSummary.confirmedCount} transaksi QRIS lunas`}
              icon={<HeartHandshake size={18} />}
              tone="emerald"
            />
            <StatCard
              label="Total Tersalurkan Valid"
              value={formatIDR(overview.kpis.totalDistributed)}
              sublabel={`${overview.kpis.verifiedReports} dari ${overview.kpis.totalReports} laporan disetujui & on-chain`}
              icon={<Wallet size={18} />}
              tone="forest"
            />
            <StatCard
              label="Saldo Amanah Tersedia"
              value={formatIDR(overview.kpis.availableBalance)}
              sublabel={`${overview.kpis.activeCampaignsCount} program zakat aktif`}
              icon={<TrendingUp size={18} />}
              tone={overview.kpis.availableBalance >= 0 ? 'gold' : 'danger'}
            />
            <StatCard
              label="Antrean & Risiko Aktif"
              value={`${overview.kpis.pendingProofCount + overview.kpis.openAnomalyCount + overview.kpis.pendingBlockchainCount + overview.kpis.lockedUserCount} item`}
              sublabel={`${overview.kpis.criticalAnomalyCount} kritis · ${overview.kpis.lockedUserCount} akun terkunci`}
              icon={<AlertTriangle size={18} />}
              tone={
                overview.kpis.criticalAnomalyCount > 0 || overview.kpis.lockedUserCount > 0
                  ? 'danger'
                  : 'neutral'
              }
            />
          </div>

          {/* Workspace Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-100/90 p-1.5 border border-slate-200/80">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[38px] px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-forest-dark shadow-xs'
                    : 'text-slate-600 hover:text-forest-dark'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'command' && (
            <div className="space-y-6">
              {/* 4 Exception Queues */}
              <div className="grid gap-5 lg:grid-cols-2">
                {/* Queue 1: Pending Proofs */}
                <Card className="p-0 sm:p-0 overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileSearch size={17} className="text-primary" />
                      <h2 className="text-sm sm:text-base font-bold text-forest-dark">
                        Bukti Menunggu Tinjauan ({overview.kpis.pendingProofCount})
                      </h2>
                    </div>
                    <Link to="/proofs" className="text-xs font-semibold text-primary hover:underline">
                      Kelola →
                    </Link>
                  </div>
                  {overview.priorityQueue.pendingProofs.length === 0 ? (
                    <p className="p-5 text-xs text-slate-500">Semua bukti penyaluran telah ditinjau.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {overview.priorityQueue.pendingProofs.slice(0, 5).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDrawerTx({ id: item.id, tab: 'proof' })}
                          className="w-full text-left px-4 sm:px-5 py-3 hover:bg-cream/80 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-forest-dark truncate">
                              #{item.id} {item.recipient_name || 'Mustahik'} · {item.category || 'Umum'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {item.region || 'Nasional'} · {formatDateTime(item.timestamp)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-forest-dark tabular-nums">
                              {formatIDR(Number(item.amount))}
                            </span>
                            <Badge tone={item.proof_url ? 'warning' : 'danger'}>
                              {item.proof_url ? 'Tinjau' : 'Tanpa Berkas'}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Queue 2: Open Anomalies */}
                <Card
                  variant={overview.kpis.openAnomalyCount > 0 ? 'anomaly' : 'default'}
                  className="p-0 sm:p-0 overflow-hidden"
                >
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={17} className="text-danger" />
                      <h2 className="text-sm sm:text-base font-bold text-forest-dark">
                        Anomali Terbuka ({overview.kpis.openAnomalyCount})
                      </h2>
                    </div>
                    <Link to="/anomalies" className="text-xs font-semibold text-primary hover:underline">
                      Kelola →
                    </Link>
                  </div>
                  {overview.priorityQueue.openAnomalies.length === 0 ? (
                    <p className="p-5 text-xs text-slate-500">Tidak ada anomali terbuka saat ini.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {overview.priorityQueue.openAnomalies.slice(0, 5).map((anom) => {
                        const pr = statusBadge(anom.priority);
                        return (
                          <div
                            key={anom.id}
                            className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-forest-dark truncate">
                                #{anom.id} · {anom.type}
                                {anom.transaction_id ? ` (Laporan #${anom.transaction_id})` : ''}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">{anom.reason || '-'}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge tone={pr.tone}>{pr.label}</Badge>
                              {anom.transaction_id && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDrawerTx({ id: anom.transaction_id as number, tab: 'audit' })
                                  }
                                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  <Eye size={12} /> Cek
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Queue 3: Pending Blockchain Sync */}
                <Card className="p-0 sm:p-0 overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Boxes size={17} className="text-primary" />
                      <h2 className="text-sm sm:text-base font-bold text-forest-dark">
                        Tertunda On-Chain ({overview.kpis.pendingBlockchainCount})
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {overview.kpis.pendingBlockchainCount > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="gold"
                          loading={batchReconcileMutation.isPending}
                          onClick={() => batchReconcileMutation.mutate()}
                        >
                          <ShieldCheck size={13} /> Rekonsiliasi Massal
                        </Button>
                      )}
                      <Link to="/explorer" className="text-xs font-semibold text-primary hover:underline">
                        Explorer →
                      </Link>
                    </div>
                  </div>
                  {overview.priorityQueue.pendingBlockchain.length === 0 ? (
                    <p className="p-5 text-xs text-slate-500">
                      Semua laporan penyaluran valid sudah tercatat di smart contract.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {overview.priorityQueue.pendingBlockchain.slice(0, 5).map((tx) => (
                        <button
                          key={tx.id}
                          type="button"
                          onClick={() => setDrawerTx({ id: tx.id, tab: 'summary' })}
                          className="w-full text-left px-4 sm:px-5 py-3 hover:bg-cream/80 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-forest-dark truncate">
                              #{tx.id} {tx.recipient_name || 'Mustahik'} · {tx.region || 'Nasional'}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500">
                              Hash: {shortHash(tx.audit_hash, 10, 8)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-forest-dark tabular-nums">
                              {formatIDR(Number(tx.amount))}
                            </p>
                            <Badge tone={statusBadge(tx.blockchain_status).tone}>
                              {statusBadge(tx.blockchain_status).label}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Queue 4: Locked Users & Attention Payments */}
                <Card className="p-0 sm:p-0 overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserCheck size={17} className="text-primary" />
                      <h2 className="text-sm sm:text-base font-bold text-forest-dark">
                        Keamanan Akun & Sesi QRIS ({overview.priorityQueue.lockedUsers.length} terkunci ·{' '}
                        {overview.priorityQueue.attentionPayments.length} sesi)
                      </h2>
                    </div>
                    <Link to="/roles" className="text-xs font-semibold text-primary hover:underline">
                      Kelola User →
                    </Link>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {overview.priorityQueue.lockedUsers.map((usr) => (
                      <div
                        key={`u-${usr.id}`}
                        className="px-4 sm:px-5 py-3 bg-red-50/40 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <p className="font-bold text-red-900">
                            Akun Terkunci: {usr.username} ({usr.role})
                          </p>
                          <p className="text-[11px] text-red-700">
                            {usr.failed_login_attempts}x gagal login · Hingga {formatDateTime(usr.locked_until)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          loading={unlockMutation.isPending}
                          onClick={() => unlockMutation.mutate(usr.id)}
                        >
                          <LockOpen size={12} /> Buka Kunci
                        </Button>
                      </div>
                    ))}
                    {overview.priorityQueue.attentionPayments.slice(0, 4).map((pay) => {
                      const pst = statusBadge(pay.status);
                      return (
                        <div
                          key={`p-${pay.id}`}
                          className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-forest-dark truncate">
                              {pay.payment_session_id} · {pay.donor_name || 'Muzakki'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {formatDateTime(pay.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-forest-dark tabular-nums">
                              {formatIDR(Number(pay.amount))}
                            </span>
                            <Badge tone={pst.tone}>{pst.label}</Badge>
                          </div>
                        </div>
                      );
                    })}
                    {overview.priorityQueue.lockedUsers.length === 0 &&
                      overview.priorityQueue.attentionPayments.length === 0 && (
                        <p className="p-5 text-xs text-slate-500">
                          Tidak ada akun terkunci maupun sesi QRIS yang tertunda atau gagal.
                        </p>
                      )}
                  </div>
                </Card>
              </div>

              {/* Cashflow Series & Program Breakdown */}
              <Card className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-forest-dark">
                      Arus Kas Zakat Masuk vs Penyaluran Valid
                    </h2>
                    <p className="text-xs text-slate-500">
                      Perbandingan nominal donasi QRIS terkonfirmasi dan laporan penyaluran disetujui + tercatat on-chain.
                    </p>
                  </div>
                  <Link to="/reconciliation" className="text-xs font-semibold text-primary hover:underline">
                    Buka Rekonsiliasi 3-Arah →
                  </Link>
                </div>

                {overview.cashflowSeries.length === 0 ? (
                  <EmptyState
                    title="Belum ada histori arus kas"
                    description="Grafik arus kas akan muncul setelah donasi atau penyaluran tercatat."
                  />
                ) : (
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={overview.cashflowSeries}>
                        <defs>
                          <linearGradient id="adminInflow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.inflow} stopOpacity={0.28} />
                            <stop offset="95%" stopColor={CHART_COLORS.inflow} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="adminOutflow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.outflow} stopOpacity={0.28} />
                            <stop offset="95%" stopColor={CHART_COLORS.outflow} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                        <XAxis
                          dataKey="bucket"
                          stroke={CHART_COLORS.axis}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke={CHART_COLORS.axis}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={74}
                          tickFormatter={(v: number) => formatNumber(v)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: 12,
                          }}
                          formatter={(val, name) => [
                            formatIDR(Number(val)),
                            name === 'donations_amount' ? 'Donasi Masuk' : 'Penyaluran Valid',
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="donations_amount"
                          name="donations_amount"
                          stroke={CHART_COLORS.inflow}
                          strokeWidth={2}
                          fill="url(#adminInflow)"
                        />
                        <Area
                          type="monotone"
                          dataKey="distributions_amount"
                          name="distributions_amount"
                          stroke={CHART_COLORS.outflow}
                          strokeWidth={2}
                          fill="url(#adminOutflow)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              <Card className="p-0 sm:p-0 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-forest-dark">
                      Rincian Dana & Penyerapan per Program
                    </h2>
                    <p className="text-xs text-slate-500">
                      Memisahkan pool tiap program kampanye dan pool Zakat Umum (Non-Program).
                    </p>
                  </div>
                  <Link to="/campaigns" className="text-xs font-semibold text-primary hover:underline">
                    Kelola Program →
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Program</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Terhimpun</th>
                        <th className="px-4 py-3 font-semibold text-right">Tersalurkan Valid</th>
                        <th className="px-4 py-3 font-semibold text-right">Dalam Proses</th>
                        <th className="px-4 py-3 font-semibold text-right">Saldo Tersedia</th>
                        <th className="px-4 py-3 font-semibold text-right">Donor / Laporan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overview.programBreakdown.map((prog) => {
                        const pst = statusBadge(prog.status);
                        return (
                          <tr key={prog.campaign_id ?? 'general'} className="hover:bg-cream/60">
                            <td className="px-4 py-3 font-semibold text-forest-dark">
                              {prog.campaign_id ? (
                                <Link to={`/campaigns/${prog.campaign_id}`} className="hover:text-primary">
                                  {prog.title}
                                </Link>
                              ) : (
                                prog.title
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge tone={pst.tone}>{pst.label}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-forest-dark tabular-nums whitespace-nowrap">
                              {formatIDR(prog.collected_amount)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums whitespace-nowrap">
                              {formatIDR(prog.distributed_amount)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600 tabular-nums whitespace-nowrap">
                              {formatIDR(prog.pending_distribution_amount)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-forest-dark tabular-nums whitespace-nowrap">
                              {formatIDR(prog.available_balance)}
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-slate-500 tabular-nums whitespace-nowrap">
                              {prog.donor_count} / {prog.tx_count}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'payments' && <PaymentWebhookMonitor />}

          {activeTab === 'blockchain' && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Status Jaringan"
                  value={overview.blockchain.networkName}
                  sublabel={`RPC: ${overview.blockchain.rpc} · Latensi ${overview.blockchain.rpcLatencyMs ?? '-'} ms`}
                  icon={<Cpu size={18} />}
                  tone={overview.blockchain.status === 'Healthy' ? 'emerald' : 'gold'}
                />
                <StatCard
                  label="Tinggi Blok & Umur"
                  value={overview.blockchain.blockNumber !== null ? `#${overview.blockchain.blockNumber}` : '-'}
                  sublabel={
                    overview.blockchain.latestBlockTimestamp
                      ? formatDateTime(overview.blockchain.latestBlockTimestamp)
                      : 'Waktu blok belum tersedia'
                  }
                  icon={<Activity size={18} />}
                  tone="forest"
                />
                <StatCard
                  label="Saldo Signer & Owner"
                  value={
                    overview.blockchain.signerBalanceEth
                      ? `${Number(overview.blockchain.signerBalanceEth).toFixed(4)} ETH`
                      : '-'
                  }
                  sublabel={
                    overview.blockchain.signerMatchesOwner === true
                      ? 'Signer cocok dengan owner() kontrak'
                      : overview.blockchain.signerMatchesOwner === false
                        ? 'Signer TIDAK cocok dengan owner()!'
                        : 'Status owner() belum terdeteksi'
                  }
                  icon={<ShieldCheck size={18} />}
                  tone={overview.blockchain.signerMatchesOwner === false ? 'danger' : 'emerald'}
                />
                <StatCard
                  label="Catatan On-Chain"
                  value={`${overview.blockchain.confirmedCount} Tercatat`}
                  sublabel={`${overview.blockchain.pendingQueueCount} tertunda · ${overview.blockchain.revokedCount} dicabut`}
                  icon={<Boxes size={18} />}
                  tone={overview.blockchain.pendingQueueCount > 0 ? 'gold' : 'neutral'}
                />
              </div>

              <Card className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-forest-dark">Detail Konfigurasi Smart Contract ZakatVerify</h2>
                  <div className="flex gap-2">
                    <Link
                      to="/network"
                      className="inline-flex items-center gap-1.5 min-h-[36px] rounded-[10px] border border-slate-200 px-3 text-xs font-semibold text-forest-dark hover:bg-mint/70"
                    >
                      <Cpu size={13} /> Detail Jaringan
                    </Link>
                    <Link
                      to="/explorer"
                      className="inline-flex items-center gap-1.5 min-h-[36px] rounded-[10px] border border-slate-200 px-3 text-xs font-semibold text-forest-dark hover:bg-mint/70"
                    >
                      <CreditCard size={13} /> Buka Explorer
                    </Link>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-xs font-mono bg-cream rounded-xl p-4 border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Alamat Kontrak</span>
                    <span className="font-bold text-forest-dark break-all">
                      {overview.blockchain.contractAddress || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Chain ID</span>
                    <span className="font-bold text-forest-dark">{overview.blockchain.chainId ?? '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Owner Kontrak (owner())</span>
                    <span className="font-bold text-forest-dark break-all">
                      {overview.blockchain.contractOwner || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Signer Backend</span>
                    <span className="font-bold text-forest-dark break-all">
                      {overview.blockchain.signerAddress || '-'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500">{ON_CHAIN_NOTE}</p>
              </Card>
            </div>
          )}

          {activeTab === 'audit' && (
            <Card className="p-0 sm:p-0 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History size={17} className="text-primary" />
                  <h2 className="text-base font-bold text-forest-dark">15 Aktivitas Audit Terbaru</h2>
                </div>
                <Link to="/audit" className="text-xs font-semibold text-primary hover:underline">
                  Buka Log Lengkap →
                </Link>
              </div>
              {overview.recentAuditLogs.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<History size={24} />}
                    title="Belum ada aktivitas tercatat"
                    description="Semua mutasi verifikasi bukti, rekonsiliasi, dan akses akun akan tercatat di sini."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Waktu</th>
                        <th className="px-4 py-3 font-semibold">Aktor</th>
                        <th className="px-4 py-3 font-semibold">Aksi</th>
                        <th className="px-4 py-3 font-semibold">Entitas</th>
                        <th className="px-4 py-3 font-semibold">Perubahan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overview.recentAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-cream/60">
                          <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                            {formatDateTime(log.timestamp)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-forest-dark">
                            {log.actor_username || 'Sistem'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone="primary" className="font-mono">{log.action}</Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">
                            {log.entity_type === 'TRANSACTION' && log.entity_id ? (
                              <button
                                type="button"
                                onClick={() => setDrawerTx({ id: log.entity_id as number, tab: 'audit' })}
                                className="font-bold text-primary hover:underline"
                              >
                                TRANSACTION #{log.entity_id}
                              </button>
                            ) : (
                              `${log.entity_type}${log.entity_id !== null ? ` #${log.entity_id}` : ''}`
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600 break-words min-w-[200px] max-w-[280px]">
                            {log.old_value ? `${log.old_value} → ` : ''}
                            {log.new_value || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
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

export default AdminHome;
