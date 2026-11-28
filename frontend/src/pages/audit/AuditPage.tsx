import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Eye, RefreshCw, Search } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime } from '../../utils/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PaginationBar,
  SectionHeader,
  Skeleton,
} from '../../components/ui';
import { TransactionDetailDrawer } from '../../components/admin/TransactionDetailDrawer';

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

interface PaginatedAuditResponse {
  items: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

const ENTITY_OPTIONS = [
  { value: '', label: 'Semua Entitas' },
  { value: 'TRANSACTION', label: 'TRANSACTION' },
  { value: 'ANOMALY', label: 'ANOMALY' },
  { value: 'RECONCILIATION', label: 'RECONCILIATION' },
  { value: 'USER', label: 'USER' },
  { value: 'CAMPAIGN', label: 'CAMPAIGN' },
  { value: 'POVERTY_STATS', label: 'POVERTY_STATS' },
  { value: 'EXPORT', label: 'EXPORT' },
];

export const AuditPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [drawerTxId, setDrawerTxId] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useQuery<PaginatedAuditResponse>({
    queryKey: ['audit-logs', entityFilter, limit, offset],
    queryFn: async () => {
      const { data: resp } = await apiClient.get<PaginatedAuditResponse>('/audit', {
        params: {
          meta: '1',
          limit,
          offset,
          ...(entityFilter ? { entity_type: entityFilter } : {}),
        },
      });
      return resp;
    },
  });

  const logs = data?.items ?? [];
  const totalCount = data?.total ?? 0;

  const filtered = searchTerm.trim()
    ? logs.filter((l) => {
        const q = searchTerm.trim().toLowerCase();
        return (
          (l.actor_username || '').toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          (l.entity_type || '').toLowerCase().includes(q) ||
          (l.new_value || '').toLowerCase().includes(q)
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
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <SectionHeader
          title="Log Audit Aktivitas"
          subtitle="Rekaman kronologis perubahan penting oleh pengguna terautentikasi dengan navigasi terpaginasi."
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter jenis entitas"
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setOffset(0);
            }}
            className="min-h-[40px] rounded-[10px] border border-slate-300 bg-white px-3 text-xs font-semibold text-forest-dark cursor-pointer"
          >
            {ENTITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Saring halaman ini (aktor/aksi)…"
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
            title="Belum ada aktivitas cocok"
            description="Log audit akan muncul setelah ada tindakan verifikasi, rekonsiliasi, atau pengelolaan akses."
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
                  <th className="px-4 py-3.5 font-semibold">Perubahan Nilai</th>
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
                    <td className="px-4 py-3.5 font-mono text-xs">
                      {l.entity_type === 'TRANSACTION' && l.entity_id !== null ? (
                        <button
                          type="button"
                          onClick={() => setDrawerTxId(l.entity_id)}
                          className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                        >
                          TRANSACTION #{l.entity_id} <Eye size={12} />
                        </button>
                      ) : (
                        <span className="text-slate-700">
                          {l.entity_type || '-'}{l.entity_id !== null ? ` #${l.entity_id}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs font-mono break-words min-w-[200px] max-w-[280px]">
                      {l.old_value ? `${l.old_value} → ` : ''}
                      {l.new_value || '-'}
                    </td>
                  </tr>
                ))}
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
        </Card>
      )}

      <TransactionDetailDrawer
        transactionId={drawerTxId}
        initialTab="audit"
        onClose={() => setDrawerTxId(null)}
      />
    </div>
  );
};

export default AuditPage;
