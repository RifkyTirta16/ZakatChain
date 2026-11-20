import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime } from '../../utils/format';
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
} from '../../components/ui';

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

const statusTone = (status: string) => {
  if (status === 'OPEN') return 'danger' as const;
  if (status === 'RESOLVED') return 'success' as const;
  return 'neutral' as const;
};

const priorityTone = (priority: string) => {
  if (priority === 'CRITICAL') return 'danger' as const;
  if (priority === 'HIGH') return 'gold' as const;
  return 'primary' as const;
};

export const AnomaliesPage = () => {
  const [resolveId, setResolveId] = useState<number | null>(null);
  const [resolveStatus, setResolveStatus] = useState<'OPEN' | 'RESOLVED' | 'CLOSED'>('RESOLVED');
  const [followUp, setFollowUp] = useState('');
  const [scanning, setScanning] = useState(false);
  const [actionError, setActionError] = useState('');

  const { data, isLoading, error, refetch } = useQuery<Anomaly[]>({
    queryKey: ['anomalies'],
    queryFn: async () => {
      const { data } = await apiClient.get<Anomaly[]>('/anomalies');
      return Array.isArray(data) ? data : [];
    },
  });

  const anomalies = data ?? [];
  const openCount = anomalies.filter((a) => a.status === 'OPEN').length;

  const scan = async () => {
    setActionError('');
    setScanning(true);
    try {
      await apiClient.post('/anomalies/scan');
      void refetch();
    } catch {
      setActionError('Gagal memindai anomali. Periksa koneksi backend.');
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveId) return;
    setActionError('');
    try {
      await apiClient.patch(`/anomalies/${resolveId}/resolve`, {
        status: resolveStatus,
        follow_up: followUp.trim() || undefined,
      });
      setResolveId(null);
      setFollowUp('');
      void refetch();
    } catch {
      setActionError('Gagal menyimpan tindak lanjut anomali.');
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
          subtitle="Temuan dari sistem deteksi otomatis backend (kelengkapan bukti, duplikasi, dan kecocokan on-chain)."
        />
        <Button onClick={() => void scan()} loading={scanning} size="sm">
          <RefreshCw size={14} /> Pindai Ulang
        </Button>
      </div>

      {actionError && (
        <div role="alert" className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="text-danger shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Anomali Terbuka"
          value={`${openCount} temuan`}
          icon={<AlertTriangle size={18} />}
          tone={openCount > 0 ? 'danger' : 'emerald'}
        />
        <StatCard
          label="Total Riwayat Temuan"
          value={`${anomalies.length} catatan`}
          icon={<RefreshCw size={18} />}
          tone="neutral"
        />
      </div>

      {anomalies.length === 0 ? (
        <Card>
          <EmptyState
            icon={<AlertTriangle size={24} />}
            title="Belum ada anomali tercatat"
            description="Jalankan pemindaian untuk mendeteksi ketidakcocokan bukti atau status on-chain."
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
                  <th className="px-4 py-3.5 font-semibold">Penerima</th>
                  <th className="px-4 py-3.5 font-semibold">Jenis & Alasan</th>
                  <th className="px-4 py-3.5 font-semibold">Prioritas</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Terdeteksi</th>
                  <th className="px-4 py-3.5 font-semibold">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {anomalies.map((a) => (
                  <tr key={a.id} className="hover:bg-cream/60">
                    <td className="px-4 py-3.5 text-slate-500 font-mono">#{a.id}</td>
                    <td className="px-4 py-3.5 text-forest-dark font-mono font-semibold">
                      {a.transaction_id === null ? '-' : `#${a.transaction_id}`}
                    </td>
                    <td className="px-4 py-3.5 text-forest-dark">{a.recipient_name || 'Tanpa penerima'}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-forest-dark block text-xs">{a.type}</span>
                      <span className="text-xs text-slate-500">{a.reason || '-'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={priorityTone(a.priority)}>{a.priority}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                      {formatDateTime(a.detected_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      {a.status === 'OPEN' && resolveId === a.id ? (
                        <form onSubmit={handleResolve} className="flex flex-col gap-2">
                          <select
                            value={resolveStatus}
                            onChange={(e) => setResolveStatus(e.target.value as 'OPEN' | 'RESOLVED' | 'CLOSED')}
                            className="bg-white border border-slate-300 px-2.5 py-1.5 rounded-[10px] text-xs text-forest-dark"
                          >
                            <option value="RESOLVED">Selesai</option>
                            <option value="CLOSED">Tutup</option>
                            <option value="OPEN">Buka Kembali</option>
                          </select>
                          <input
                            value={followUp}
                            onChange={(e) => setFollowUp(e.target.value)}
                            placeholder="Catatan tindak lanjut"
                            className="bg-white border border-slate-300 px-2.5 py-1.5 rounded-[10px] text-xs text-forest-dark sm:w-44"
                          />
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" disabled={!followUp.trim() && resolveStatus === 'RESOLVED'}>
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
                ))}
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

export default AnomaliesPage;
