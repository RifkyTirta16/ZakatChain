import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, CheckCircle2, Eye, RefreshCw } from 'lucide-react';
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
  StatCard,
  statusBadge,
} from '../../components/ui';
import { TransactionDetailDrawer } from '../../components/admin/TransactionDetailDrawer';

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

interface PaginatedAnomaliesResponse {
  items: Anomaly[];
  total: number;
  limit: number;
  offset: number;
}

const STATUS_TABS = [
  { id: '', label: 'Semua Temuan' },
  { id: 'OPEN', label: 'Perlu Tindak Lanjut' },
  { id: 'RESOLVED', label: 'Terselesaikan' },
  { id: 'CLOSED', label: 'Ditutup' },
];

export const AnomaliesPage = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [resolveId, setResolveId] = useState<number | null>(null);
  const [resolveStatus, setResolveStatus] = useState<'OPEN' | 'RESOLVED' | 'CLOSED'>('RESOLVED');
  const [followUp, setFollowUp] = useState('');
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [drawerTxId, setDrawerTxId] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useQuery<PaginatedAnomaliesResponse>({
    queryKey: ['anomalies', statusFilter, limit, offset],
    queryFn: async () => {
      const { data: resp } = await apiClient.get<PaginatedAnomaliesResponse>('/anomalies', {
        params: {
          meta: '1',
          limit,
          offset,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
      });
      return resp;
    },
  });

  const anomalies = data?.items ?? [];
  const totalCount = data?.total ?? 0;
  const openOnPage = anomalies.filter((a) => a.status === 'OPEN').length;

  const scan = async () => {
    setFeedback(null);
    setScanning(true);
    try {
      const { data: resp } = await apiClient.post<{ anomaliesFound?: number }>('/anomalies/scan');
      setFeedback({
        type: 'ok',
        text: `Pemindaian selesai: ${resp.anomaliesFound ?? 0} temuan baru ditambahkan ke daftar anomali.`,
      });
      void refetch();
    } catch {
      setFeedback({ type: 'err', text: 'Gagal memindai anomali. Periksa koneksi backend.' });
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveId) return;
    setFeedback(null);
    try {
      await apiClient.patch(`/anomalies/${resolveId}/resolve`, {
        status: resolveStatus,
        follow_up: followUp.trim() || undefined,
      });
      setResolveId(null);
      setFollowUp('');
      setFeedback({ type: 'ok', text: `Tindak lanjut anomali #${resolveId} berhasil disimpan.` });
      void refetch();
    } catch {
      setFeedback({ type: 'err', text: 'Gagal menyimpan tindak lanjut anomali.' });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <Skeleton lines={7} />
      </Card>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="Gagal memuat daftar anomali."
        retry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Anomali Distribusi"
          subtitle="Temuan dari sistem deteksi otomatis backend (kelengkapan bukti, duplikasi, dan sinkronisasi on-chain)."
        />
        <Button onClick={() => void scan()} loading={scanning} size="sm">
          <RefreshCw size={14} /> Pindai Ulang
        </Button>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'err' ? 'alert' : 'status'}
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 font-medium ${
            feedback.type === 'ok'
              ? 'bg-mint border-primary/25 text-forest'
              : 'bg-red-50 border-red-200 text-red-800'
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

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Perlu Tindak Lanjut (Halaman Ini)"
          value={`${openOnPage} temuan`}
          icon={<AlertTriangle size={18} />}
          tone={openOnPage > 0 ? 'danger' : 'emerald'}
        />
        <StatCard
          label="Total Temuan (Filter Aktif)"
          value={`${totalCount} catatan`}
          icon={<RefreshCw size={18} />}
          tone="neutral"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setStatusFilter(tab.id);
              setOffset(0);
            }}
            className={`min-h-[36px] px-3.5 rounded-[10px] text-xs font-semibold border transition-colors ${
              statusFilter === tab.id
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-forest-dark border-slate-200 hover:bg-mint/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {anomalies.length === 0 ? (
        <Card>
          <EmptyState
            icon={<AlertTriangle size={24} />}
            title="Belum ada anomali pada filter ini"
            description="Jalankan pemindaian atau pilih tab status lain."
          />
        </Card>
      ) : (
        <Card className="p-0 sm:p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3.5 font-semibold">ID</th>
                  <th className="px-4 py-3.5 font-semibold">Transaksi</th>
                  <th className="px-4 py-3.5 font-semibold">Penerima & Nominal</th>
                  <th className="px-4 py-3.5 font-semibold">Jenis & Alasan</th>
                  <th className="px-4 py-3.5 font-semibold">Prioritas</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Terdeteksi</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {anomalies.map((a) => {
                  const prBadge = statusBadge(a.priority);
                  const stBadge = statusBadge(a.status);
                  return (
                    <tr key={a.id} className="hover:bg-cream/60">
                      <td className="px-4 py-3.5 text-slate-500 font-mono">#{a.id}</td>
                      <td className="px-4 py-3.5 font-mono font-semibold">
                        {a.transaction_id === null ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDrawerTxId(a.transaction_id as number)}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            #{a.transaction_id} <Eye size={12} />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-forest-dark">
                        <span className="font-semibold block">{a.recipient_name || 'Tanpa penerima'}</span>
                        {a.amount !== null && (
                          <span className="text-xs text-slate-500 tabular-nums">{formatIDR(Number(a.amount))}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-forest-dark block text-xs">{a.type}</span>
                        <span className="text-xs text-slate-500">{a.reason || '-'}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge tone={prBadge.tone}>{prBadge.label}</Badge>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge tone={stBadge.tone}>{stBadge.label}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                        {formatDateTime(a.detected_at)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {a.status === 'OPEN' && resolveId === a.id ? (
                          <form onSubmit={handleResolve} className="flex flex-col gap-2 text-left">
                            <select
                              value={resolveStatus}
                              onChange={(e) => setResolveStatus(e.target.value as 'OPEN' | 'RESOLVED' | 'CLOSED')}
                              className="bg-white border border-slate-300 px-2.5 py-1.5 rounded-[10px] text-xs text-forest-dark"
                            >
                              <option value="RESOLVED">Terselesaikan</option>
                              <option value="CLOSED">Ditutup</option>
                              <option value="OPEN">Perlu Tindak Lanjut</option>
                            </select>
                            <input
                              value={followUp}
                              onChange={(e) => setFollowUp(e.target.value)}
                              placeholder="Catatan tindak lanjut"
                              className="bg-white border border-slate-300 px-2.5 py-1.5 rounded-[10px] text-xs text-forest-dark sm:w-44"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="submit"
                                size="sm"
                                disabled={!followUp.trim() && resolveStatus === 'RESOLVED'}
                              >
                                Simpan
                              </Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setResolveId(null)}>
                                Batal
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <Button
                            onClick={() => setResolveId(a.id)}
                            size="sm"
                            variant="secondary"
                            disabled={resolveId !== null || a.status !== 'OPEN'}
                          >
                            {a.status === 'OPEN' ? 'Tindak Lanjut' : 'Selesai'}
                          </Button>
                        )}
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
        initialTab="audit"
        onClose={() => setDrawerTxId(null)}
        onUpdated={() => void refetch()}
      />
    </div>
  );
};

export default AnomaliesPage;
