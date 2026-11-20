import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Activity } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime } from '../../utils/format';
import { Button, Card, EmptyState, ErrorState, Skeleton } from '../../components/ui';
interface AuditLog {
  id: number;
  actor_id: number | null;
  actor_username: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  old_value: string | null;
  new_value: string | null;
  timestamp: string;
}

export const AuditPage = () => {
  const { data, isLoading, error, refetch } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data } = await apiClient.get<AuditLog[]>('/audit');
      return data;
    },
  });

  const logs = data ?? [];

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
        <ErrorState message="Gagal memuat log audit." retry={() => { refetch(); }} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-primary-dark mb-1">Log Audit</h1>
          <p className="text-primary-dark/70">Riwayat tindakan penting yang dilakukan pengguna terautentikasi.</p>
        </div>
        <Button onClick={refetch} size="sm">
          <RefreshCw size={14} className="mr-2" /> Segarkan
        </Button>
      </div>

      {logs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Activity size={40} className="text-primary" />}
            title="Belum ada aktivitas tercatat"
            description="Log audit akan muncul setelah ada tindakan yang dicegat sistem."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto rounded-xl border border-primary-bg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-bg text-primary-dark text-xs">
                  <th className="px-3 py-3 text-left font-bold">Waktu</th>
                  <th className="px-3 py-3 text-left font-bold">Aktor</th>
                  <th className="px-3 py-3 text-left font-bold">Aksi</th>
                  <th className="px-3 py-3 text-left font-bold">Tipe Entitas</th>
                  <th className="px-3 py-3 text-left font-bold">ID Entitas</th>
                  <th className="px-3 py-3 text-left font-bold">Nilai Baru</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-primary-bg hover:bg-primary-bg/40 transition-colors">
                    <td className="px-3 py-3 text-primary-dark/70 whitespace-nowrap font-mono text-xs">{formatDateTime(l.timestamp)}</td>
                    <td className="px-3 py-3 text-primary-dark">{l.actor_username || 'Sistem'}</td>
                    <td className="px-3 py-3 text-primary-dark font-mono text-xs">{l.action}</td>
                    <td className="px-3 py-3 text-primary-dark">{l.entity_type || '-'}</td>
                    <td className="px-3 py-3 text-primary-dark font-mono text-xs">{l.entity_id === null ? '-' : l.entity_id}</td>
                    <td className="px-3 py-3 text-primary-dark/70 text-xs break-all">{l.new_value || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AuditPage;
