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
  SectionHeader,
  Skeleton,
  StatCard,
  proofBadge,
} from '../../components/ui';
import type { Transaction } from '../Dashboard';

interface ExtendedTransaction extends Transaction {
  proof_rejection_reason?: string | null;
  allocations?: Array<{ region: string; amount: number }>;
}

const isPendingReview = (t: ExtendedTransaction) =>
  t.proof_status === null ||
  ['DRAFT', 'PENDING', 'PENDING_BLOCKCHAIN'].includes(t.proof_status ?? '');

export const ProofsPage = () => {
  const [verifyId, setVerifyId] = useState<number | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');

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

  const { data, isLoading, error, refetch } = useQuery<ExtendedTransaction[]>({
    queryKey: ['proof-verification'],
    queryFn: async () => {
      const { data } = await apiClient.get<ExtendedTransaction[]>('/transactions');
      return Array.isArray(data) ? data : [];
    },
  });

  const allTransactions = data ?? [];
  const pendingCount = allTransactions.filter(isPendingReview).length;
  const approvedCount = allTransactions.filter((t) => t.proof_status === 'APPROVED').length;
  const rejectedCount = allTransactions.filter((t) => t.proof_status === 'REJECTED').length;

  const transactions = allTransactions.filter((t) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return isPendingReview(t);
    return t.proof_status === statusFilter;
  });

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
      // Request via apiClient so HttpOnly session cookies & CORS credentials attach cleanly,
      // overriding baseURL ('/api' or 'https://.../api') so '/uploads/*' hits server root.
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
          subtitle="Periksa berkas bukti penyaluran yang diunggah amil lalu setujui atau tolak laporan."
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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Menunggu Review"
          value={`${pendingCount} bukti`}
          icon={<FileSearch size={18} />}
          tone={pendingCount > 0 ? 'gold' : 'emerald'}
        />
        <StatCard
          label="Disetujui Auditor"
          value={`${approvedCount} bukti`}
          icon={<FileSearch size={18} />}
          tone="emerald"
        />
        <StatCard
          label="Ditolak / Perbaikan"
          value={`${rejectedCount} bukti`}
          icon={<AlertCircle size={18} />}
          tone={rejectedCount > 0 ? 'danger' : 'neutral'}
        />
      </div>

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

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: 'PENDING', label: `Menunggu (${pendingCount})` },
            { key: 'APPROVED', label: `Disetujui (${approvedCount})` },
            { key: 'REJECTED', label: `Ditolak (${rejectedCount})` },
            { key: 'ALL', label: `Semua (${allTransactions.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
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
                  <th className="px-4 py-3.5 font-semibold">Status Bukti</th>
                  <th className="px-4 py-3.5 font-semibold">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const badge = proofBadge(t.proof_status ?? 'PENDING');
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
                      <td className="px-4 py-3.5 text-slate-600 text-xs">
                        {t.region || '-'}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {t.proof_url ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void openProofPreview(t)}
                          >
                            <Eye size={13} /> Lihat Bukti
                          </Button>
                        ) : (
                          <span className="text-xs text-danger font-medium">Tanpa Berkas</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                        {t.proof_rejection_reason && (
                          <p className="text-[11px] text-danger mt-1 max-w-[160px] truncate" title={t.proof_rejection_reason}>
                            {t.proof_rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {verifyId === t.id ? (
                          <form onSubmit={verify} className="flex flex-col gap-2">
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
                            variant="secondary"
                            disabled={verifyId !== null}
                          >
                            Tinjau
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-cream border-t border-slate-100 text-xs text-slate-500">
            {ON_CHAIN_NOTE}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProofsPage;
