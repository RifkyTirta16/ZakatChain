import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  History,
  Link2,
  MapPin,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime, formatIDR, shortHash } from '../../utils/format';
import { getStoredSessionUser } from '../layout/navConfig';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  ON_CHAIN_NOTE,
  Select,
  Skeleton,
  SlideOverDrawer,
  statusBadge,
} from '../ui';

type InspectorTab = 'summary' | 'proof' | 'audit';

export interface TransactionDetailResponse {
  transaction: {
    id: number;
    amount: number;
    donor_name: string | null;
    recipient_name: string | null;
    category: string | null;
    region: string | null;
    campaign_id: number | null;
    mustahik_id: number | null;
    proof_url: string | null;
    file_hash: string | null;
    audit_hash: string | null;
    tx_hash: string | null;
    blockchain_status: string | null;
    block_number: number | null;
    proof_status: string | null;
    proof_rejection_reason: string | null;
    is_reconciled: number;
    revoke_tx_hash: string | null;
    revoke_reason: string | null;
    timestamp: string;
  };
  allocations: Array<{ id: number; region: string; amount: number; notes: string | null }>;
  campaign: { id: number; title: string; status: string; target_amount: number; current_amount: number } | null;
  mustahik: {
    id: number;
    full_name: string;
    category_asnaf: string;
    region: string;
    phone_masked: string | null;
    verification_status: string;
  } | null;
  anomalies: Array<{
    id: number;
    type: string;
    reason: string | null;
    priority: string;
    detected_at: string;
    status: string;
    follow_up: string | null;
  }>;
  auditLogs: Array<{
    id: number;
    actor_username: string | null;
    action: string;
    entity_type: string;
    entity_id: number | null;
    old_value: string | null;
    new_value: string | null;
    timestamp: string;
  }>;
}

export interface TransactionDetailDrawerProps {
  transactionId: number | null;
  initialTab?: InspectorTab;
  onClose: () => void;
  onUpdated?: () => void;
}

/** Cross-module slide-over inspector linking transaction ledger, proof file, allocations, anomalies, and audit logs. */
export const TransactionDetailDrawer = ({
  transactionId,
  initialTab = 'summary',
  onClose,
  onUpdated,
}: TransactionDetailDrawerProps) => {
  const queryClient = useQueryClient();
  const role = getStoredSessionUser()?.role ?? '';
  const isAdmin = role === 'ADMIN';
  const canVerifyProof = role === 'ADMIN' || role === 'AUDITOR';

  const tabKey = `${transactionId ?? 'none'}:${initialTab}`;
  const [overrideTab, setOverrideTab] = useState<{ key: string; tab: InspectorTab } | null>(null);
  const tab = overrideTab?.key === tabKey ? overrideTab.tab : initialTab;
  const selectTab = (next: InspectorTab) => setOverrideTab({ key: tabKey, tab: next });

  const [proofDecision, setProofDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectReason, setRejectReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const detailQuery = useQuery<TransactionDetailResponse>({
    queryKey: ['transaction-detail', transactionId],
    enabled: transactionId !== null,
    queryFn: async () => {
      const { data } = await apiClient.get<TransactionDetailResponse>(`/transactions/${transactionId}`);
      return data;
    },
  });

  const proofUrl = detailQuery.data?.transaction.proof_url ?? null;

  const proofBlobQuery = useQuery<{ objectUrl: string; mime: string }>({
    queryKey: ['transaction-proof-blob', transactionId, proofUrl],
    enabled: transactionId !== null && tab === 'proof' && Boolean(proofUrl),
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      if (!proofUrl) throw new Error('Berkas bukti tidak tersedia');
      const base = apiClient.defaults.baseURL || '';
      const rootOrigin = base.replace(/\/api\/?$/, '');
      const isRelative = proofUrl.startsWith('/');
      const response = await apiClient.get<Blob>(proofUrl, {
        ...(isRelative ? { baseURL: rootOrigin } : {}),
        responseType: 'blob',
      });
      return {
        objectUrl: URL.createObjectURL(response.data),
        mime: response.data.type || '',
      };
    },
  });

  useEffect(() => {
    const url = proofBlobQuery.data?.objectUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [proofBlobQuery.data?.objectUrl]);

  const invalidateOperational = () => {
    void detailQuery.refetch();
    void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    void queryClient.invalidateQueries({ queryKey: ['proof-verification'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-transactions'] });
    void queryClient.invalidateQueries({ queryKey: ['explorer-transactions'] });
    void queryClient.invalidateQueries({ queryKey: ['reconciliation-three-way'] });
    onUpdated?.();
  };

  const verifyProofMutation = useMutation({
    mutationFn: async () => {
      if (!transactionId) return;
      const payload: { status: 'APPROVED' | 'REJECTED'; reason?: string } = { status: proofDecision };
      if (proofDecision === 'REJECTED') payload.reason = rejectReason.trim();
      await apiClient.patch(`/proofs/verify/${transactionId}`, payload);
    },
    onSuccess: () => {
      setFeedback({
        type: 'ok',
        text:
          proofDecision === 'APPROVED'
            ? 'Bukti penyaluran disetujui dan tercatat di Log Audit.'
            : 'Bukti penyaluran ditolak dengan alasan perbaikan.',
      });
      setRejectReason('');
      invalidateOperational();
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFeedback({ type: 'err', text: apiErr || 'Gagal memperbarui status verifikasi bukti.' });
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      if (!transactionId) return null;
      const { data } = await apiClient.patch<{ tx_hash?: string }>(`/transactions/${transactionId}/reconcile`);
      return data;
    },
    onSuccess: (data) => {
      setFeedback({
        type: 'ok',
        text: `Hash laporan berhasil dicatat ke Ethereum${data?.tx_hash ? ` (${shortHash(data.tx_hash, 8, 6)})` : ''}.`,
      });
      invalidateOperational();
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFeedback({ type: 'err', text: apiErr || 'Gagal mencatat hash laporan ke smart contract.' });
    },
  });

  const handleClose = () => {
    setFeedback(null);
    setRejectReason('');
    onClose();
  };

  const detail = detailQuery.data;
  const tx = detail?.transaction;
  const proofSt = statusBadge(tx?.proof_status ?? 'PENDING');
  const chainSt = statusBadge(tx?.blockchain_status ?? 'PENDING_BLOCKCHAIN');
  const timelineCount = (detail?.anomalies.length ?? 0) + (detail?.auditLogs.length ?? 0);

  return (
    <SlideOverDrawer
      isOpen={transactionId !== null}
      onClose={handleClose}
      widthClass="max-w-2xl"
      title={tx ? `Inspeksi Penyaluran #${tx.id}` : `Inspeksi Penyaluran #${transactionId ?? ''}`}
      subtitle={
        tx
          ? `${tx.recipient_name || 'Mustahik'} · ${tx.region || 'Nasional'} · ${formatDateTime(tx.timestamp)}`
          : 'Memuat data lintas modul transaksi, bukti, mustahik, dan log audit…'
      }
      headerActions={
        tx ? (
          <Link
            to={`/verify?query=${tx.id}`}
            className="inline-flex items-center gap-1 min-h-[34px] rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-semibold text-forest-dark hover:bg-mint/70"
          >
            Verifikasi Publik <ExternalLink size={12} />
          </Link>
        ) : undefined
      }
    >
      {detailQuery.isPending ? (
        <Skeleton lines={10} />
      ) : detailQuery.isError || !detail || !tx ? (
        <ErrorState
          message="Gagal memuat rincian lintas modul untuk transaksi ini."
          retry={() => void detailQuery.refetch()}
        />
      ) : (
        <div className="space-y-5">
          {feedback && (
            <div
              role={feedback.type === 'err' ? 'alert' : 'status'}
              className={`rounded-xl border p-3 text-xs flex items-center gap-2 font-medium ${
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

          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => selectTab('summary')}
              className={`min-h-[38px] rounded-[9px] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
                tab === 'summary' ? 'bg-white text-forest-dark shadow-xs' : 'text-slate-600 hover:text-forest-dark'
              }`}
            >
              <Link2 size={13} /> Ringkasan & Alokasi
            </button>
            <button
              type="button"
              onClick={() => selectTab('proof')}
              className={`min-h-[38px] rounded-[9px] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
                tab === 'proof' ? 'bg-white text-forest-dark shadow-xs' : 'text-slate-600 hover:text-forest-dark'
              }`}
            >
              <FileSearch size={13} /> Berkas Bukti
            </button>
            <button
              type="button"
              onClick={() => selectTab('audit')}
              className={`min-h-[38px] rounded-[9px] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
                tab === 'audit' ? 'bg-white text-forest-dark shadow-xs' : 'text-slate-600 hover:text-forest-dark'
              }`}
            >
              <History size={13} /> Anomali & Audit ({timelineCount})
            </button>
          </div>

          {tab === 'summary' && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3.5 rounded-2xl bg-cream p-4 border border-slate-200">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Nominal Disalurkan
                  </span>
                  <span className="font-display text-xl font-extrabold text-primary tabular-nums">
                    {formatIDR(Number(tx.amount))}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Status Bukti & On-Chain
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge tone={proofSt.tone}>{proofSt.label}</Badge>
                    <Badge tone={chainSt.tone}>{chainSt.label}</Badge>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Program Penyaluran
                  </span>
                  <span className="text-sm font-semibold text-forest-dark">
                    {detail.campaign?.title || 'Zakat Umum (Non-Program)'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Kategori & Sumber
                  </span>
                  <span className="text-sm font-semibold text-forest-dark">
                    {tx.category || 'Umum'} · {tx.donor_name || 'Dana Terhimpun'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <UserCheck size={14} className="text-primary" /> Penerima Manfaat (Mustahik · Privat Staf)
                  </h3>
                  {detail.mustahik && (
                    <Badge tone={statusBadge(detail.mustahik.verification_status).tone}>
                      {statusBadge(detail.mustahik.verification_status).label}
                    </Badge>
                  )}
                </div>
                {detail.mustahik ? (
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    <p>
                      <span className="text-slate-500">Nama:</span>{' '}
                      <strong className="text-forest-dark">{detail.mustahik.full_name}</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Asnaf:</span>{' '}
                      <strong className="text-forest-dark">{detail.mustahik.category_asnaf}</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Wilayah:</span>{' '}
                      <strong className="text-forest-dark">{detail.mustahik.region}</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Kontak:</span>{' '}
                      <span className="font-mono text-forest-dark">{detail.mustahik.phone_masked || '-'}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-forest-dark">
                    {tx.recipient_name || 'Tidak tertaut ke ID master mustahik'}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MapPin size={14} className="text-primary" /> Alokasi Wilayah ({detail.allocations.length || 1} Daerah)
                </h3>
                {detail.allocations.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {detail.allocations.map((a) => (
                      <div key={a.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <p className="font-semibold text-forest-dark">{a.region}</p>
                          {a.notes && <p className="text-slate-500">{a.notes}</p>}
                        </div>
                        <span className="font-bold text-forest-dark tabular-nums">{formatIDR(Number(a.amount))}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">
                    Wilayah tunggal: <strong className="text-forest-dark">{tx.region || 'Nasional'}</strong> ({formatIDR(Number(tx.amount))})
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs font-mono">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Audit Hash (SHA-256)</span>
                  <span className="font-semibold text-forest-dark break-all text-right">
                    {shortHash(tx.audit_hash, 12, 10)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Tx Hash Ethereum</span>
                  <span className="font-semibold text-forest-dark break-all text-right">
                    {shortHash(tx.tx_hash, 12, 10)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Nomor Blok</span>
                  <span className="font-semibold text-forest-dark">
                    {tx.block_number !== null ? `#${tx.block_number}` : '-'}
                  </span>
                </div>
                {tx.revoke_reason && (
                  <div className="pt-2 border-t border-red-200 text-red-800 font-sans">
                    <strong>Alasan Pencabutan On-Chain:</strong> {tx.revoke_reason}
                  </div>
                )}
              </div>

              {isAdmin && tx.blockchain_status === 'PENDING_BLOCKCHAIN' && tx.proof_status !== 'REJECTED' && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="gold"
                    loading={reconcileMutation.isPending}
                    onClick={() => reconcileMutation.mutate()}
                  >
                    <ShieldCheck size={15} /> Catat ke Ethereum Sekarang
                  </Button>
                </div>
              )}
            </div>
          )}

          {tab === 'proof' && (
            <div className="space-y-4">
              {!tx.proof_url ? (
                <EmptyState
                  icon={<FileSearch size={24} />}
                  title="Belum ada berkas bukti terunggah"
                  description="Laporan ini belum memiliki lampiran foto atau PDF bukti penyaluran."
                />
              ) : proofBlobQuery.isPending ? (
                <Skeleton lines={8} />
              ) : proofBlobQuery.isError ? (
                <ErrorState
                  message="Gagal memuat berkas bukti terproteksi dari server."
                  retry={() => void proofBlobQuery.refetch()}
                />
              ) : proofBlobQuery.data ? (
                proofBlobQuery.data.mime.includes('pdf') || tx.proof_url.toLowerCase().endsWith('.pdf') ? (
                  <div className="space-y-2">
                    <iframe
                      title={`Bukti PDF Penyaluran #${tx.id}`}
                      src={proofBlobQuery.data.objectUrl}
                      className="w-full h-96 rounded-xl border border-slate-200 bg-white"
                    />
                    <a
                      href={proofBlobQuery.data.objectUrl}
                      download={`bukti-penyaluran-${tx.id}.pdf`}
                      className="inline-flex text-xs font-semibold text-primary hover:underline"
                    >
                      Unduh Berkas PDF
                    </a>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex justify-center">
                    <img
                      src={proofBlobQuery.data.objectUrl}
                      alt={`Bukti penyaluran laporan #${tx.id}`}
                      className="max-h-96 rounded-lg object-contain"
                    />
                  </div>
                )
              ) : null}

              {canVerifyProof && tx.blockchain_status !== 'REVOKED' && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setFeedback(null);
                    verifyProofMutation.mutate();
                  }}
                  className="rounded-2xl border border-slate-200 bg-cream/70 p-4 space-y-3"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-forest-dark">
                    Keputusan Verifikasi Bukti (Auditor / Admin)
                  </p>
                  <Select
                    label="Status Keputusan"
                    value={proofDecision}
                    onChange={(e) => setProofDecision(e.target.value as 'APPROVED' | 'REJECTED')}
                    options={[
                      { value: 'APPROVED', label: 'Setujui Bukti (APPROVED)' },
                      { value: 'REJECTED', label: 'Tolak / Minta Perbaikan (REJECTED)' },
                    ]}
                  />
                  {proofDecision === 'REJECTED' && (
                    <div className="space-y-1">
                      <label htmlFor="drawer-reject-reason" className="block text-xs font-semibold text-slate-600">
                        Alasan Penolakan (Wajib)
                      </label>
                      <input
                        id="drawer-reject-reason"
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Jelaskan kekurangan berkas bukti…"
                        className="w-full min-h-[40px] rounded-[10px] border border-slate-300 bg-white px-3 text-xs text-forest-dark outline-none focus:ring-2 focus:ring-primary/25"
                      />
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant={proofDecision === 'REJECTED' ? 'danger' : 'primary'}
                      size="sm"
                      loading={verifyProofMutation.isPending}
                      disabled={(proofDecision === 'APPROVED' && !tx.proof_url) || (proofDecision === 'REJECTED' && !rejectReason.trim())}
                    >
                      Simpan Keputusan Bukti
                    </Button>
                  </div>
                </form>
              )}

              {tx.blockchain_status === 'REVOKED' && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  Laporan telah dicabut on-chain sehingga status bukti tidak dapat disetujui ulang.
                </div>
              )}
            </div>
          )}

          {tab === 'audit' && (
            <div className="space-y-5">
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-700" /> Temuan Anomali Terkait ({detail.anomalies.length})
                </h3>
                {detail.anomalies.length === 0 ? (
                  <p className="text-xs text-slate-500 rounded-xl bg-slate-50 border border-slate-200/80 p-3.5">
                    Tidak ada anomali yang tertaut ke laporan ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detail.anomalies.map((a) => {
                      const pr = statusBadge(a.priority);
                      const st = statusBadge(a.status);
                      return (
                        <div key={a.id} className="rounded-xl border border-slate-200 p-3.5 space-y-1.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-forest-dark">
                              #{a.id} · {a.type}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Badge tone={pr.tone}>{pr.label}</Badge>
                              <Badge tone={st.tone}>{st.label}</Badge>
                            </div>
                          </div>
                          {a.reason && <p className="text-slate-600">{a.reason}</p>}
                          {a.follow_up && <p className="text-primary font-medium">Tindak lanjut: {a.follow_up}</p>}
                          <p className="text-[11px] text-slate-400">{formatDateTime(a.detected_at)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <History size={14} className="text-primary" /> Riwayat Log Audit ({detail.auditLogs.length})
                </h3>
                {detail.auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 rounded-xl bg-slate-50 border border-slate-200/80 p-3.5">
                    Belum ada entri log audit untuk transaksi ini.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {detail.auditLogs.map((log) => (
                      <div key={log.id} className="p-3 text-xs space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge tone="primary" className="font-mono">{log.action}</Badge>
                            <span className="font-semibold text-forest-dark">
                              {log.actor_username || 'Sistem'}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">
                            {formatDateTime(log.timestamp)}
                          </span>
                        </div>
                        {(log.old_value || log.new_value) && (
                          <p className="text-slate-600 font-mono text-[11px] break-all">
                            {log.old_value || '-'} → {log.new_value || '-'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">{ON_CHAIN_NOTE}</p>
        </div>
      )}
    </SlideOverDrawer>
  );
};
