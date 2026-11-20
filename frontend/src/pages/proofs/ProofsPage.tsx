import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSearch, RefreshCw } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatIDR, formatDateTime } from '../../utils/format';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { proofBadge, ON_CHAIN_NOTE } from '../../components/ui/badgeStatus';
import type { Transaction } from '../Dashboard';

const needsReview = (t: Transaction) =>
  t.proof_status === null ||
  ['DRAFT', 'PENDING', 'PENDING_BLOCKCHAIN'].includes(t.proof_status ?? '');

export const ProofsPage = () => {
  const [verifyId, setVerifyId] = useState<number | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, error, refetch } = useQuery<Transaction[]>({
    queryKey: ['proof-verification'],
    queryFn: async () => {
      const { data } = await apiClient.get<Transaction[]>('/transactions');
      return data;
    },
  });

  const transactions = (data ?? []).filter(needsReview);
  const pendingCount = transactions.length;

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyId) return;
    const body: { status: 'APPROVED' | 'REJECTED'; reason?: string } = { status: verifyStatus };
    if (verifyStatus === 'REJECTED' && rejectReason.trim()) {
      body.reason = rejectReason.trim();
    }
    if (verifyStatus === 'REJECTED' && !rejectReason.trim()) {
      return;
    }
    await apiClient.patch(`/proofs/verify/${verifyId}`, body);
    setVerifyId(null);
    setRejectReason('');
    refetch();
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl p-6">
        <Skeleton lines={6} className="w-full rounded-xl" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl p-6">
        <ErrorState message="Gagal memuat antrean verifikasi bukti." retry={() => { refetch(); }} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary-dark mb-1">Verifikasi Bukti</h1>
        <p className="text-primary-dark/70">Setujui atau tolak bukti penyaluran yang menunggu review.</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Card variant={pendingCount > 0 ? 'anomaly' : 'default'} className="flex-1 min-w-[200px]">
          <p className="text-sm text-primary-dark/70 mb-1">Menunggu review</p>
          <p className="text-xl font-extrabold text-primary-dark">{pendingCount} bukti</p>
        </Card>
        <Button onClick={refetch} size="sm">
          <RefreshCw size={14} className="mr-2" /> Segarkan
        </Button>
      </div>

      {transactions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileSearch size={40} className="text-primary" />}
            title="Semua bukti telah ditinjau"
            description="Tidak ada bukti penyaluran yang menunggu persetujuan."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto rounded-xl border border-primary-bg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-bg text-primary-dark text-xs">
                  <th className="px-3 py-3 text-left font-bold">ID</th>
                  <th className="px-3 py-3 text-left font-bold">Penerima</th>
                  <th className="px-3 py-3 text-left font-bold">Nilai</th>
                  <th className="px-3 py-3 text-left font-bold">Wilayah</th>
                  <th className="px-3 py-3 text-left font-bold">Waktu</th>
                  <th className="px-3 py-3 text-left font-bold">Status Bukti</th>
                  <th className="px-3 py-3 text-left font-bold">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const badge = proofBadge(t.proof_status ?? '');
                  return (
                    <tr key={t.id} className="border-t border-primary-bg hover:bg-primary-bg/40 transition-colors">
                      <td className="px-3 py-3 text-primary-dark/70 font-mono">#{t.id}</td>
                      <td className="px-3 py-3 text-primary-dark">{t.recipient_name || 'Tanpa penerima'}</td>
                      <td className="px-3 py-3 text-right text-primary-dark">{formatIDR(t.amount)}</td>
                      <td className="px-3 py-3 text-primary-dark">{t.region || '-'}</td>
                      <td className="px-3 py-3 text-primary-dark/70 whitespace-nowrap">{formatDateTime(t.timestamp)}</td>
                      <td className="px-3 py-3">
                        <Badge tone={badge.tone} className="text-xs">{badge.label}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        {verifyId === t.id ? (
                          <form onSubmit={verify} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <select
                              value={verifyStatus}
                              onChange={(e) => setVerifyStatus(e.target.value as 'APPROVED' | 'REJECTED')}
                              className="bg-cream border border-primary-bg px-2 py-1 rounded-md text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="APPROVED">Setujui</option>
                              <option value="REJECTED">Tolak</option>
                            </select>
                            {verifyStatus === 'REJECTED' && (
                              <input
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Alasan penolakan wajib diisi"
                                className="bg-cream border border-primary-bg px-2 py-1 rounded-md text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary sm:w-48"
                              />
                            )}
                            <Button type="submit" size="sm" disabled={verifyStatus === 'REJECTED' && !rejectReason.trim()}>
                              Simpan
                            </Button>
                            <button
                              type="button"
                              onClick={() => setVerifyId(null)}
                              className="text-xs text-primary-dark/60 underline underline-offset-4"
                            >
                              Batal
                            </button>
                          </form>
                        ) : (
                          <Button onClick={() => setVerifyId(t.id)} size="sm" variant="secondary" disabled={verifyId !== null}>
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
          <p className="text-xs text-primary-dark/70 mt-3">{ON_CHAIN_NOTE}</p>
        </Card>
      )}
    </div>
  );
};

export default ProofsPage;
