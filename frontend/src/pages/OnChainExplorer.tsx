import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import apiClient from '../utils/api';
import { getStoredSessionUser } from '../components/layout/navConfig';
import { formatDateTime, formatIDR, shortHash } from '../utils/format';
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
  statusBadge,
} from '../components/ui';
import { EthereumLogo, NetworkBadge, explorerBaseForChain, useNetworkInfo } from '../components/ethereum';
import { TransactionDetailDrawer } from '../components/admin/TransactionDetailDrawer';

interface RegionAllocation {
  region: string;
  amount: number;
  notes?: string | null;
}

interface ExplorerTransaction {
  id: number;
  amount: number;
  category: string | null;
  region: string | null;
  timestamp: string;
  tx_hash: string | null;
  audit_hash: string | null;
  proof_status?: string | null;
  blockchain_status: string | null;
  block_number: number | null;
  revoke_tx_hash?: string | null;
  revoke_reason?: string | null;
  allocations?: RegionAllocation[];
}

interface PaginatedExplorerResponse {
  items: ExplorerTransaction[];
  total: number;
  limit: number;
  offset: number;
}

interface VerificationDetail {
  status: string;
  network?: {
    chainId: number | null;
    networkName: string;
    contractAddress: string;
  };
  data: {
    id: number;
    amount: number;
    category: string | null;
    region: string | null;
    timestamp: string;
    audit_hash?: string | null;
    auditHash?: string | null;
    tx_hash: string | null;
    blockchain_status?: string | null;
    status?: string | null;
    block_number?: number | null;
    revoke_tx_hash?: string | null;
    revoke_reason?: string | null;
    allocations?: RegionAllocation[];
  } | null;
}

const OnChainExplorer = () => {
  const network = useNetworkInfo();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<VerificationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [reconcilingId, setReconcilingId] = useState<number | null>(null);
  const [reconcileMsg, setReconcileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ExplorerTransaction | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [drawerTxId, setDrawerTxId] = useState<number | null>(null);

  const isAdmin = getStoredSessionUser()?.role === 'ADMIN';

  const { data, isLoading, isError, refetch } = useQuery<PaginatedExplorerResponse>({
    queryKey: ['explorer-transactions', searchTerm, statusFilter, limit, offset],
    queryFn: async () => {
      const { data: resp } = await apiClient.get<PaginatedExplorerResponse>('/transactions', {
        params: {
          meta: '1',
          limit,
          offset,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
        },
      });
      return resp;
    },
  });

  const batchReconcileMutation = useMutation({
    mutationFn: async () => {
      const { data: resp } = await apiClient.post<{ attempted: number; confirmed: number; failed: number }>(
        '/transactions/reconcile-batch',
        { limit: 10 }
      );
      return resp;
    },
    onSuccess: (res) => {
      setReconcileMsg({
        type: res.failed > 0 ? 'err' : 'ok',
        text: `Rekonsiliasi massal: ${res.confirmed} dari ${res.attempted} transaksi berhasil dicatat ke Ethereum${res.failed > 0 ? `, ${res.failed} gagal` : ''}.`,
      });
      void refetch();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setReconcileMsg({ type: 'err', text: e.response?.data?.error || 'Rekonsiliasi massal gagal.' });
    },
  });

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    window.setTimeout(() => setCopiedHash(null), 2000);
  };

  const verifyItem = async (tx: ExplorerTransaction) => {
    setDetailLoading(true);
    setDetailError('');
    setSelectedDetail(null);
    try {
      const endpoint = tx.audit_hash
        ? `/explorer/verify/hash/${encodeURIComponent(tx.audit_hash)}`
        : `/explorer/verify/${encodeURIComponent(String(tx.id))}`;
      const { data: resp } = await apiClient.get<VerificationDetail>(endpoint);
      setSelectedDetail(resp);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setDetailError(e.response?.data?.error || 'Gagal memverifikasi catatan on-chain.');
    } finally {
      setDetailLoading(false);
    }
  };

  const retryOnChain = async (id: number) => {
    setReconcilingId(id);
    setReconcileMsg(null);
    try {
      const { data: resp } = await apiClient.patch<{ message?: string; tx_hash?: string }>(
        `/transactions/${id}/reconcile`
      );
      setReconcileMsg({
        type: 'ok',
        text: `Transaksi #${id} berhasil direkonsiliasi ke Ethereum (${shortHash(resp.tx_hash, 8, 6)}).`,
      });
      void refetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setReconcileMsg({
        type: 'err',
        text: e.response?.data?.error || `Gagal mengirim transaksi #${id} ke Ethereum.`,
      });
    } finally {
      setReconcilingId(null);
    }
  };

  const submitRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeTarget) return;
    if (revokeReason.trim().length < 5) {
      setReconcileMsg({ type: 'err', text: 'Alasan pencabutan minimal 5 karakter.' });
      return;
    }
    setRevokingId(revokeTarget.id);
    setReconcileMsg(null);
    try {
      const { data: resp } = await apiClient.patch<{ message?: string; revoke_tx_hash?: string }>(
        `/transactions/${revokeTarget.id}/revoke`,
        { reason: revokeReason.trim() }
      );
      setReconcileMsg({
        type: 'ok',
        text: `Laporan #${revokeTarget.id} berhasil dicabut on-chain${resp.revoke_tx_hash ? ` (${shortHash(resp.revoke_tx_hash, 8, 6)})` : ''}.`,
      });
      setRevokeTarget(null);
      setRevokeReason('');
      void refetch();
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } } };
      setReconcileMsg({
        type: 'err',
        text: e2.response?.data?.error || `Gagal mencabut laporan #${revokeTarget.id} di smart contract.`,
      });
    } finally {
      setRevokingId(null);
    }
  };

  if (isError) {
    return (
      <ErrorState
        message="Gagal memuat catatan transaksi on-chain. Periksa koneksi ke backend."
        retry={() => void refetch()}
      />
    );
  }

  const list = data?.items ?? [];
  const totalCount = data?.total ?? 0;
  const detailData = selectedDetail?.data ?? null;
  const detailNetName = selectedDetail?.network?.networkName || network.label;
  const detailChainId = selectedDetail?.network?.chainId ?? network.chainId;
  const detailExplorer = explorerBaseForChain(detailChainId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <SectionHeader
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mint border border-primary/25 px-3 py-1 text-xs font-semibold text-forest">
              <EthereumLogo size={11} /> Ethereum Explorer
            </span>
          }
          title="On-Chain Proof Explorer"
          subtitle="Penjelajah hash audit penyaluran terpaginasi penuh dengan rekonsiliasi massal dan inspeksi lintas modul."
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <NetworkBadge compact />
          {isAdmin && (
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
          <div className="inline-flex items-center gap-2 bg-white px-3 py-2 rounded-[10px] border border-slate-300">
            <Filter size={14} className="text-slate-500" />
            <select
              aria-label="Filter status on-chain"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setOffset(0);
              }}
              className="bg-transparent text-xs sm:text-sm text-forest-dark font-medium outline-none cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="CONFIRMED">{statusBadge('CONFIRMED').label}</option>
              <option value="PENDING_BLOCKCHAIN">{statusBadge('PENDING_BLOCKCHAIN').label}</option>
              <option value="REVOKED">{statusBadge('REVOKED').label}</option>
            </select>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Cari nama atau hash audit…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setOffset(0);
              }}
              className="w-full min-h-[40px] bg-white rounded-[10px] border border-slate-300 pl-8 pr-3 text-xs sm:text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
        </div>
      </div>

      {reconcileMsg && (
        <div
          role={reconcileMsg.type === 'err' ? 'alert' : 'status'}
          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center gap-2 font-medium ${
            reconcileMsg.type === 'ok'
              ? 'bg-mint border-primary/25 text-forest'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {reconcileMsg.type === 'ok' ? (
            <CheckCircle2 size={16} className="text-primary shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-danger shrink-0" />
          )}
          <span>{reconcileMsg.text}</span>
        </div>
      )}

      {detailLoading && (
        <Card>
          <Skeleton lines={4} />
        </Card>
      )}

      {detailError && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm flex items-center gap-2 font-medium"
        >
          <AlertCircle size={16} className="text-danger shrink-0" />
          <span>{detailError}</span>
        </div>
      )}

      {selectedDetail && detailData && (
        <Card variant="highlight" className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-forest-dark">
                Detail Verifikasi Transaksi #{detailData.id}
              </h2>
              <p className="text-xs text-slate-500">Jaringan: {detailNetName}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              className="text-xs font-semibold text-slate-600 hover:text-forest-dark"
            >
              Tutup
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Nominal</span>
              <span className="font-bold text-sm text-forest-dark tabular-nums">{formatIDR(detailData.amount)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Status Database</span>
              <Badge tone={statusBadge(detailData.blockchain_status ?? detailData.status ?? '').tone}>
                {statusBadge(detailData.blockchain_status ?? detailData.status ?? '').label}
              </Badge>
            </div>
            <div>
              <span className="text-slate-500 block">Status Smart Contract</span>
              <span className="font-bold text-forest-dark">{selectedDetail.status}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Waktu Pencatatan</span>
              <span className="font-mono">{formatDateTime(detailData.timestamp)}</span>
            </div>
          </div>

          <div className="p-3 bg-cream rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                Transaction Hash {detailData.block_number ? `· Blok #${detailData.block_number}` : ''}
              </span>
              {detailData.tx_hash && detailExplorer && (
                <a
                  href={`${detailExplorer}/tx/${detailData.tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  Etherscan <ExternalLink size={12} />
                </a>
              )}
            </div>
            <p className="font-mono font-bold text-forest-dark break-all">
              {detailData.tx_hash || 'Belum ada tx_hash on-chain'}
            </p>
            {detailData.revoke_reason && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-800 space-y-1">
                <p className="font-bold">Dicabut (Revoked): {detailData.revoke_reason}</p>
                {detailData.revoke_tx_hash && (
                  <p className="font-mono text-[11px] break-all">Tx pencabutan: {detailData.revoke_tx_hash}</p>
                )}
              </div>
            )}
            {detailData.allocations && detailData.allocations.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-1">
                <p className="text-[11px] font-semibold text-slate-600">Sebaran Wilayah:</p>
                <div className="flex flex-wrap gap-1.5">
                  {detailData.allocations.map((a, idx) => (
                    <span
                      key={`${a.region}-${idx}`}
                      className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[11px] text-forest-dark font-medium tabular-nums"
                    >
                      {a.region}: {formatIDR(a.amount)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {revokeTarget && (
        <Card className="border-red-200 bg-red-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-red-900 flex items-center gap-2">
              <Ban size={16} className="text-danger" /> Cabut (Revoke) Laporan #{revokeTarget.id} di Smart Contract
            </h2>
            <button
              type="button"
              onClick={() => {
                setRevokeTarget(null);
                setRevokeReason('');
              }}
              className="text-xs font-semibold text-slate-600 hover:text-forest-dark"
            >
              Batal
            </button>
          </div>
          <p className="text-xs text-slate-700">
            Pemanggilan <code className="font-mono">ZakatVerify.revokeReport()</code> bersifat permanen (sticky) di blockchain dan tidak dapat dibatalkan.
          </p>
          <form onSubmit={(e) => void submitRevoke(e)} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Alasan pencabutan (min. 5 karakter), mis. Dokumen ganda / tidak valid"
              className="flex-1 min-h-[40px] rounded-[10px] border border-slate-300 bg-white px-3 text-xs sm:text-sm text-forest-dark outline-none focus:ring-2 focus:ring-danger/25"
            />
            <Button type="submit" variant="danger" size="sm" loading={revokingId === revokeTarget.id}>
              <Ban size={13} /> Konfirmasi Cabut On-Chain
            </Button>
          </form>
        </Card>
      )}

      <Card className="p-0 sm:p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <Skeleton lines={8} />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title="Tidak ada catatan transaksi"
            description={
              searchTerm || statusFilter
                ? 'Tidak ada catatan transaksi yang cocok dengan filter.'
                : 'Belum ada transaksi distribusi yang tercatat.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">ID</th>
                    <th className="py-3.5 px-4">Tx Hash Ethereum</th>
                    <th className="py-3.5 px-4">Audit Hash</th>
                    <th className="py-3.5 px-4">Kategori & Wilayah</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Blok</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((t) => {
                    const isCopiedTx = copiedHash === t.tx_hash;
                    const isCopiedAudit = copiedHash === t.audit_hash;
                    const isRevoked = t.blockchain_status === 'REVOKED';
                    const isRejected = t.proof_status === 'REJECTED';
                    const isConfirmed = t.blockchain_status === 'CONFIRMED';
                    const isPendingChain = !isRevoked && !isRejected && (!t.tx_hash || !isConfirmed);
                    const st = statusBadge(t.blockchain_status ?? 'PENDING_BLOCKCHAIN');
                    return (
                      <tr key={t.id} className="hover:bg-cream/60">
                        <td className="py-3.5 px-4 font-mono font-bold text-forest-dark">#{t.id}</td>
                        <td className="py-3.5 px-4 font-mono text-xs">
                          {t.tx_hash ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-forest-dark">{shortHash(t.tx_hash, 6, 4)}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(t.tx_hash!)}
                                aria-label="Salin tx hash"
                                className="p-1 rounded text-slate-400 hover:text-primary hover:bg-slate-100"
                              >
                                {isCopiedTx ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs">
                          {t.audit_hash ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-600">{shortHash(t.audit_hash, 6, 4)}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(t.audit_hash!)}
                                aria-label="Salin audit hash"
                                className="p-1 rounded text-slate-400 hover:text-primary hover:bg-slate-100"
                              >
                                {isCopiedAudit ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-forest-dark block text-xs">{t.category || 'Umum'}</span>
                          <span className="text-[11px] text-slate-500 block truncate max-w-[160px]">
                            {t.region || 'Nasional'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone={st.tone}>{st.label}</Badge>
                            {isRejected && !isRevoked && <Badge tone="danger">Ditolak</Badge>}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                          {t.block_number ? `#${t.block_number}` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setDrawerTxId(t.id)}
                          >
                            <Eye size={11} /> Detail
                          </Button>
                          {isAdmin && isPendingChain && (
                            <Button
                              size="sm"
                              variant="gold"
                              loading={reconcilingId === t.id}
                              disabled={reconcilingId !== null || revokingId !== null}
                              onClick={() => void retryOnChain(t.id)}
                            >
                              <RefreshCw size={11} /> Catat ke Ethereum
                            </Button>
                          )}
                          {isAdmin && isConfirmed && (
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={reconcilingId !== null || revokingId !== null}
                              onClick={() => {
                                setRevokeTarget(t);
                                setRevokeReason('');
                              }}
                            >
                              <Ban size={11} /> Cabut On-Chain
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => void verifyItem(t)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[10px] border border-slate-300 text-xs font-semibold text-forest-dark hover:bg-mint hover:border-primary/40 transition-colors"
                          >
                            Periksa <ExternalLink size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar
              total={totalCount}
              limit={limit}
              offset={offset}
              onOffsetChange={setOffset}
              onLimitChange={setLimit}
            />
          </>
        )}

        <div className="p-4 bg-cream border-t border-slate-100 text-xs text-slate-600">{ON_CHAIN_NOTE}</div>
      </Card>

      <TransactionDetailDrawer
        transactionId={drawerTxId}
        onClose={() => setDrawerTxId(null)}
        onUpdated={() => void refetch()}
      />
    </div>
  );
};

export default OnChainExplorer;
