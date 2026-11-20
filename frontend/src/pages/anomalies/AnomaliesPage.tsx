import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime } from '../../utils/format';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { ON_CHAIN_NOTE } from '../../components/ui/badgeStatus';

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
  if (status === 'OPEN') return 'coral';
  if (status === 'RESOLVED') return 'success';
  return 'neutral';
};

const priorityTone = (priority: string) => {
  if (priority === 'CRITICAL') return 'coral';
  if (priority === 'HIGH') return 'gold';
  return 'primary';
};

export const AnomaliesPage = () => {
  const [resolveId, setResolveId] = useState<number | null>(null);
  const [resolveStatus, setResolveStatus] = useState<'OPEN' | 'RESOLVED' | 'CLOSED'>('RESOLVED');
  const [followUp, setFollowUp] = useState('');

  const { data, isLoading, error, refetch } = useQuery<Anomaly[]>({
    queryKey: ['anomalies'],
    queryFn: async () => {
      const { data } = await apiClient.get<Anomaly[]>('/anomalies');
      return data;
    },
  });

  const anomalies = data ?? [];
  const openCount = anomalies.filter((a) => a.status === 'OPEN').length;

  const scan = async () => {
    await apiClient.post('/anomalies/scan');
    refetch();
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveId) return;
    await apiClient.patch(`/anomalies/${resolveId}/resolve`, {
      status: resolveStatus,
      follow_up: followUp.trim() || undefined,
    });
    setResolveId(null);
    setFollowUp('');
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
        <ErrorState message="Gagal memuat daftar anomali." retry={() => { refetch(); }} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary-dark mb-1">Anomali Distribusi</h1>
        <p className="text-primary-dark/70">Temuan yang perlu tindak lanjut dari sistem deteksi backend.</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Card variant={openCount > 0 ? 'anomaly' : 'default'} className="flex-1 min-w-[200px]">
          <p className="text-sm text-primary-dark/70 mb-1">Anomali terbuka</p>
          <p className="text-xl font-extrabold text-primary-dark">{openCount}</p>
        </Card>
        <Button onClick={() => scan()} size="sm">
          <RefreshCw size={14} className="mr-2" /> Pindai Ulang
        </Button>
      </div>

      {anomalies.length === 0 ? (
        <Card>
          <EmptyState
            icon={<AlertTriangle size={40} className="text-primary" />}
            title="Belum ada anomali tercatat"
            description="Jalankan pemindaian anomali untuk mendeteksi ketidakcocokan data."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto rounded-xl border border-primary-bg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-bg text-primary-dark text-xs">
                  <th className="px-3 py-3 text-left font-bold">ID</th>
                  <th className="px-3 py-3 text-left font-bold">Transaksi</th>
                  <th className="px-3 py-3 text-left font-bold">Penerima</th>
                  <th className="px-3 py-3 text-left font-bold">Jenis</th>
                  <th className="px-3 py-3 text-left font-bold">Prioritas</th>
                  <th className="px-3 py-3 text-left font-bold">Alasan</th>
                  <th className="px-3 py-3 text-left font-bold">Status</th>
                  <th className="px-3 py-3 text-left font-bold">Terdeteksi</th>
                  <th className="px-3 py-3 text-left font-bold">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a) => (
                  <tr key={a.id} className="border-t border-primary-bg hover:bg-primary-bg/40 transition-colors">
                    <td className="px-3 py-3 text-primary-dark/70 font-mono">#{a.id}</td>
                    <td className="px-3 py-3 text-primary-dark font-mono">
                      {a.transaction_id === null ? '-' : `#${a.transaction_id}`}
                    </td>
                    <td className="px-3 py-3 text-primary-dark">{a.recipient_name || 'Tanpa penerima'}</td>
                    <td className="px-3 py-3 text-primary-dark">{a.type}</td>
                    <td className="px-3 py-3">
                      <Badge tone={priorityTone(a.priority)} className="text-xs">{a.priority}</Badge>
                    </td>
                    <td className="px-3 py-3 text-primary-dark">{a.reason || '-'}</td>
                    <td className="px-3 py-3">
                      <Badge tone={statusTone(a.status)} className="text-xs">{a.status}</Badge>
                    </td>
                    <td className="px-3 py-3 text-primary-dark/70 whitespace-nowrap">{formatDateTime(a.detected_at)}</td>
                    <td className="px-3 py-3">
                      {a.status === 'OPEN' && resolveId === a.id ? (
                        <form onSubmit={handleResolve} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <select
                            value={resolveStatus}
                            onChange={(e) => setResolveStatus(e.target.value as 'OPEN' | 'RESOLVED' | 'CLOSED')}
                            className="bg-cream border border-primary-bg px-2 py-1 rounded-md text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="RESOLVED">Selesai</option>
                            <option value="CLOSED">Tutup</option>
                            <option value="OPEN">Buka Kembali</option>
                          </select>
                          <input
                            value={followUp}
                            onChange={(e) => setFollowUp(e.target.value)}
                            placeholder="Tindak lanjut (opsional)"
                            className="bg-cream border border-primary-bg px-2 py-1 rounded-md text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary sm:w-48"
                          />
                          <Button type="submit" size="sm" disabled={!followUp.trim() && resolveStatus === 'RESOLVED'}>
                            Simpan
                          </Button>
                          <button
                            type="button"
                            onClick={() => setResolveId(null)}
                            className="text-xs text-primary-dark/60 underline underline-offset-4"
                          >
                            Batal
                          </button>
                        </form>
                      ) : (
                        <Button
                          onClick={() => setResolveId(a.id)}
                          size="sm"
                          variant="secondary"
                          disabled={resolveId !== null}
                        >
                          Selesaikan
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-primary-dark/70 mt-3">{ON_CHAIN_NOTE}</p>
        </Card>
      )}
    </div>
  );
};

export default AnomaliesPage;
