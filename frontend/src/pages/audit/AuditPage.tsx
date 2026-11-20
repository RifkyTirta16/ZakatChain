import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, RefreshCw, Search } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime } from '../../utils/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  SectionHeader,
  Skeleton,
} from '../../components/ui';

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
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error, refetch } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data } = await apiClient.get<AuditLog[]>('/audit');
      return Array.isArray(data) ? data : [];
    },
  });

  const logs = data ?? [];
  const filtered = searchTerm.trim()
    ? logs.filter((l) => {
        const q = searchTerm.trim().toLowerCase();
        return (
          (l.actor_username || '').toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          (l.entity_type || '').toLowerCase().includes(q)
        );
      })
    : logs;

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
        message="Gagal memuat log audit."
        retry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Log Audit Aktivitas"
          subtitle="Rekaman kronologis perubahan penting oleh pengguna terautentikasi."
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari aktor / aksi…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-h-[40px] rounded-[10px] border border-slate-300 bg-white pl-8 pr-3 text-xs sm:text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <Button variant="secondary" onClick={() => void refetch()} size="sm">
            <RefreshCw size={14} /> Segarkan
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Activity size={24} />}
            title="Belum ada aktivitas tercatat"
            description="Log audit akan muncul setelah ada tindakan verifikasi atau rekonsiliasi."
          />
        </Card>
      ) : (
        <Card className="p-0 sm:p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3.5 font-semibold">Waktu</th>
                  <th className="px-4 py-3.5 font-semibold">Aktor</th>
                  <th className="px-4 py-3.5 font-semibold">Aksi</th>
                  <th className="px-4 py-3.5 font-semibold">Entitas</th>
                  <th className="px-4 py-3.5 font-semibold">Nilai Baru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-cream/60">
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap font-mono text-xs">
                      {formatDateTime(l.timestamp)}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-forest-dark">
                      {l.actor_username || 'Sistem'}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone="primary" className="font-mono">{l.action}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-mono text-xs">
                      {l.entity_type || '-'}{l.entity_id !== null ? ` #${l.entity_id}` : ''}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs break-all">
                      {l.new_value || '-'}
                    </td>
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
