import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Eye, FileSearch, RefreshCw, X } from 'lucide-react';
import apiClient from '../../utils/api';
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
  statusBadge,
} from '../../components/ui';
import type { Transaction } from '../Dashboard';
import { TransactionDetailDrawer } from '../../components/admin/TransactionDetailDrawer';

interface ExtendedTransaction extends Transaction {
  proof_rejection_reason?: string | null;
  allocations?: Array<{ region: string; amount: number }>;
}

interface PaginatedProofsResponse {
  items: ExtendedTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export const ProofsPage = () => {
  const [verifyId, setVerifyId] = useState<number | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [drawerTxId, setDrawerTxId] = useState<number | null>(null);

  const [previewTx, setPreviewTx] = useState<ExtendedTransaction | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  const { data, isLoading, error, refetch } = useQuery<PaginatedProofsResponse>({
    queryKey: ['proof-verification', statusFilter, limit, offset],
    queryFn: async () => {
      const { data: resp } = await apiClient.get<PaginatedProofsResponse>('/transactions', {
        params: {
          meta: '1',
          limit,
          offset,
          ...(statusFilter !== 'ALL' ? { proof_status: statusFilter } : {}),
        },
      });
      return resp;
    },
  });

  const transactions = data?.items ?? [];
  const totalCount = data?.total ?? 0;

  const closePreview = () => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    setPreviewBlobUrl(null);
    setPreviewMime('');
    setPreviewError('');
    setPreviewTx(null);
  };

  const openProofPreview = async (tx: ExtendedTransaction) => {
    if (!tx.proof_url) return;
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    setPreviewTx(tx);
    setPreviewBlobUrl(null);
    setPreviewMime('');
    setPreviewError('');
    setPreviewLoading(true);

    try {
      const base = apiClient.defaults.baseURL || '';
      const rootOrigin = base.replace(/\/api\/?$/, '');
      const isRelative = tx.proof_url.startsWith('/');
      const response = await apiClient.get<Blob>(tx.proof_url, {
        ...(isRelative ? { baseURL: rootOrigin } : {}),
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      setPreviewBlobUrl(url);
      setPreviewMime(response.data.type || '');
    } catch {
      setPreviewError('Berkas bukti tidak ditemukan atau gagal dimuat.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyId) return;
    if (verifyStatus === 'REJECTED' && !rejectReason.trim()) return;
    setActionError('');
    try {
      const body: { status: 'APPROVED' | 'REJECTED'; reason?: string } = { status: verifyStatus };
      if (verifyStatus === 'REJECTED') body.reason = rejectReason.trim();
      await apiClient.patch(`/proofs/verify/${verifyId}`, body);
      setVerifyId(null);
      setRejectReason('');
      void refetch();
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setActionError(apiErr || 'Gagal memperbarui status bukti penyaluran.');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <Skeleton lines={6} />
      </Card>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="Gagal memuat antrean verifikasi bukti."
        retry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Verifikasi Bukti Penyaluran"
          subtitle="Periksa berkas bukti terproteksi, cek keterkaitan transaksi lintas modul, lalu setujui atau tolak laporan."
        />
        <Button variant="secondary" size="sm" onClick={() => void refetch()}>
          <RefreshCw size={14} /> Segarkan
        </Button>
      </div>

      {actionError && (
        <div role="alert" className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="text-danger shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {previewTx && (
        <Card variant="highlight" className="space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-forest-dark">
                Pratinjau Berkas Bukti · Laporan #{previewTx.id}
              </h2>
              <p className="text-xs text-slate-500">
                Penerima: {previewTx.recipient_name || 'Tanpa penerima'} · {formatIDR(previewTx.amount)} · {previewTx.region}
              </p>
            </div>
            <button
              type="button"
              onClick={closePreview}
              aria-label="Tutup pratinjau bukti"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>

          {previewLoading ? (
            <Skeleton lines={6} />
          ) : previewError ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {previewError}
            </p>
          ) : previewBlobUrl ? (
            previewMime.includes('pdf') || previewTx.proof_url?.toLowerCase().endsWith('.pdf') ? (
              <div className="space-y-2">
                <iframe
                  title={`Bukti PDF Laporan #${previewTx.id}`}
                  src={previewBlobUrl}
                  className="w-full h-96 rounded-xl border border-slate-200 bg-white"
                />
                <a
                  href={previewBlobUrl}
                  download={`bukti-laporan-${previewTx.id}.pdf`}
                  className="inline-flex text-xs font-semibold text-primary hover:underline"
                >
                  Unduh Berkas PDF
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex justify-center">
                <img
                  src={previewBlobUrl}
                  alt={`Bukti penyaluran laporan #${previewTx.id}`}
                  className="max-h-96 rounded-lg object-contain"
                />
              </div>
            )
          ) : null}
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: 'PENDING', label: 'Menunggu Review' },
              { key: 'APPROVED', label: 'Disetujui Auditor' },
              { key: 'REJECTED', label: 'Ditolak' },
              { key: 'ALL', label: 'Semua Laporan' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key);
                setOffset(0);
              }}
              className={`px-3.5 py-2 rounded-[10px] text-xs font-semibold border transition-colors ${
                statusFilter === tab.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-forest-dark border-slate-200 hover:bg-mint/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 tabular-nums">Total: {totalCount} laporan</span>
      </div>

      {transactions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileSearch size={24} />}
            title="Tidak ada bukti pada filter ini"
            description="Pilih tab status lain atau tunggu laporan penyaluran baru dari Amil."
          />
        </Card>
      ) : (
        <Card className="p-0 sm:p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3.5 font-semibold">ID</th>
                  <th className="px-4 py-3.5 font-semibold">Penerima</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Nilai</th>
                  <th className="px-4 py-3.5 font-semibold">Wilayah</th>
                  <th className="px-4 py-3.5 font-semibold">Berkas Bukti</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const isRevoked = t.blockchain_status === 'REVOKED';
                  const badge = statusBadge(t.proof_status ?? 'PENDING');
                  const revokedBadge = statusBadge('REVOKED');
                  return (
                    <tr key={t.id} className="hover:bg-cream/60">
                      <td className="px-4 py-3.5 text-slate-500 font-mono">
                        <span>#{t.id}</span>
                        <p className="text-[11px] text-slate-400 whitespace-nowrap">{formatDateTime(t.timestamp)}</p>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-forest-dark">
                        {t.recipient_name || 'Tanpa penerima'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-forest-dark tabular-nums whitespace-nowrap">
                        {formatIDR(t.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">{t.region || '-'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {t.proof_url ? (
                          <Button size="sm" variant="secondary" onClick={() => void openProofPreview(t)}>
                            <Eye size={13} /> Lihat Bukti
                          </Button>
                        ) : (
                          <span className="text-xs text-danger font-medium">Tanpa Berkas</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                          {isRevoked && <Badge tone={revokedBadge.tone}>{revokedBadge.label}</Badge>}
                        </div>
                        {t.proof_rejection_reason && (
                          <p
                            className="text-[11px] text-danger max-w-[160px] truncate"
                            title={t.proof_rejection_reason}
                          >
                            {t.proof_rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setDrawerTxId(t.id)}
                          >
                            <FileSearch size={12} /> Detail
                          </Button>
                          {isRevoked ? (
                            <span className="text-xs text-slate-400 px-2">Dicabut On-Chain</span>
                          ) : verifyId === t.id ? (
                            <form onSubmit={verify} className="flex flex-col gap-2 text-left">
                              <select
                                value={verifyStatus}
                                onChange={(e) => setVerifyStatus(e.target.value as 'APPROVED' | 'REJECTED')}
                                className="bg-white border border-slate-300 px-2.5 py-1.5 rounded-[10px] text-xs text-forest-dark"
                              >
                                <option value="APPROVED">Setujui</option>
                                <option value="REJECTED">Tolak</option>
                              </select>
                              {verifyStatus === 'REJECTED' && (
                                <input
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="Alasan penolakan wajib diisi"
                                  className="bg-white border border-slate-300 px-2.5 py-1.5 rounded-[10px] text-xs text-forest-dark sm:w-48"
                                />
                              )}
                              <div className="flex gap-2">
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={verifyStatus === 'REJECTED' && !rejectReason.trim()}
                                >
                                  Simpan
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setVerifyId(null)}>
                                  Batal
                                </Button>
                              </div>
                            </form>
                          ) : (
                            <Button
                              onClick={() => {
                                setVerifyId(t.id);
                                setVerifyStatus('APPROVED');
                                setRejectReason('');
                              }}
                              size="sm"
                              variant="primary"
                              disabled={verifyId !== null}
                            >
                              Tinjau
                            </Button>
                          )}
                        </div>
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
          <div className="px-5 py-3 bg-cream border-t border-slate-100 text-xs text-slate-500">
            {ON_CHAIN_NOTE}
          </div>
        </Card>
      )}

      <TransactionDetailDrawer
        transactionId={drawerTxId}
        initialTab="proof"
        onClose={() => setDrawerTxId(null)}
        onUpdated={() => void refetch()}
      />
    </div>
  );
};

export default ProofsPage;
