import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, FileSearch, RefreshCw } from 'lucide-react';
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

const needsReview = (t: Transaction) =>
  t.proof_status === null ||
  ['DRAFT', 'PENDING', 'PENDING_BLOCKCHAIN'].includes(t.proof_status ?? '');

export const ProofsPage = () => {
  const [verifyId, setVerifyId] = useState<number | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');

  const { data, isLoading, error, refetch } = useQuery<Transaction[]>({
    queryKey: ['proof-verification'],
    queryFn: async () => {
      const { data } = await apiClient.get<Transaction[]>('/transactions');
      return Array.isArray(data) ? data : [];
    },
  });

  const transactions = (data ?? []).filter(needsReview);
  const pendingCount = transactions.length;

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
    } catch {
      setActionError('Gagal memperbarui status bukti penyaluran.');
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
          subtitle="Setujui atau tolak berkas bukti penyaluran yang menunggu tinjauan Auditor."
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

      <StatCard
        label="Antrean Menunggu Review"
        value={`${pendingCount} bukti`}
        icon={<FileSearch size={18} />}
        tone={pendingCount > 0 ? 'gold' : 'emerald'}
        className="max-w-xs"
      />

      {transactions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileSearch size={24} />}
            title="Semua bukti telah ditinjau"
            description="Tidak ada bukti penyaluran yang menunggu persetujuan saat ini."
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
                  <th className="px-4 py-3.5 font-semibold">Waktu</th>
                  <th className="px-4 py-3.5 font-semibold">Status Bukti</th>
                  <th className="px-4 py-3.5 font-semibold">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const badge = proofBadge(t.proof_status ?? 'PENDING');
                  return (
                    <tr key={t.id} className="hover:bg-cream/60">
                      <td className="px-4 py-3.5 text-slate-500 font-mono">#{t.id}</td>
                      <td className="px-4 py-3.5 font-semibold text-forest-dark">
                        {t.recipient_name || 'Tanpa penerima'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-forest-dark tabular-nums">
                        {formatIDR(t.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{t.region || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                        {formatDateTime(t.timestamp)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
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
                            onClick={() => setVerifyId(t.id)}
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
