import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, QrCode, RefreshCw, Search, Webhook } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime, formatIDR } from '../../utils/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PaginationBar,
  Skeleton,
  SlideOverDrawer,
  StatCard,
  statusBadge,
} from '../ui';

interface PaymentSessionRow {
  id: number;
  payment_session_id: string;
  donor_name: string | null;
  donor_username: string | null;
  amount: number;
  program_id: string | null;
  campaign_title: string | null;
  status: string;
  raw_status: string;
  channel: 'DOKU' | 'SANDBOX';
  provider_tx_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

interface PaymentsResponse {
  items: PaymentSessionRow[];
  total: number;
  limit: number;
  offset: number;
  summary: {
    totalCount: number;
    confirmedCount: number;
    pendingCount: number;
    expiredCount: number;
    failedCount: number;
    confirmedVolume: number;
    dokuCount: number;
    sandboxCount: number;
  };
}

interface PaymentEventRow {
  id: number;
  donation_id: number | null;
  provider_tx_id: string | null;
  event_type: string;
  payload: string | null;
  timestamp: string;
}

const STATUS_FILTERS = [
  { value: '', label: 'Semua Status' },
  { value: 'CONFIRMED', label: 'Lunas' },
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'EXPIRED', label: 'Kedaluwarsa' },
  { value: 'FAILED', label: 'Gagal' },
];

/** Admin/Auditor monitor for QRIS/DOKU checkout sessions and webhook settlement events. */
export const PaymentWebhookMonitor = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(15);
  const [offset, setOffset] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const paymentsQuery = useQuery<PaymentsResponse>({
    queryKey: ['admin-payments', statusFilter, search, limit, offset],
    queryFn: async () => {
      const { data } = await apiClient.get<PaymentsResponse>('/payments', {
        params: {
          limit,
          offset,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      });
      return data;
    },
    refetchInterval: 30_000,
  });

  const eventsQuery = useQuery<{ session_id: string; events: PaymentEventRow[] }>({
    queryKey: ['admin-payment-events', selectedSessionId],
    enabled: Boolean(selectedSessionId),
    queryFn: async () => {
      const { data } = await apiClient.get<{ session_id: string; events: PaymentEventRow[] }>(
        `/payments/${encodeURIComponent(selectedSessionId ?? '')}/events`
      );
      return data;
    },
  });

  if (paymentsQuery.isError) {
    return (
      <ErrorState
        message="Gagal memuat log sesi pembayaran dan webhook QRIS."
        retry={() => void paymentsQuery.refetch()}
      />
    );
  }

  const summary = paymentsQuery.data?.summary;
  const items = paymentsQuery.data?.items ?? [];
  const total = paymentsQuery.data?.total ?? 0;
  const conversionRate =
    summary && summary.totalCount > 0 ? Math.round((summary.confirmedCount / summary.totalCount) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Volume QRIS Lunas"
          value={formatIDR(summary?.confirmedVolume ?? 0)}
          sublabel={`${summary?.confirmedCount ?? 0} dari ${summary?.totalCount ?? 0} sesi`}
          icon={<CreditCard size={18} />}
          tone="emerald"
        />
        <StatCard
          label="Rasio Konversi Lunas"
          value={`${conversionRate}%`}
          sublabel="Sesi lunas dibanding total checkout"
          icon={<QrCode size={18} />}
          tone="forest"
        />
        <StatCard
          label="Menunggu / Gagal"
          value={`${summary?.pendingCount ?? 0} / ${summary?.failedCount ?? 0}`}
          sublabel={`${summary?.expiredCount ?? 0} sesi kedaluwarsa`}
          icon={<Webhook size={18} />}
          tone={(summary?.failedCount ?? 0) > 0 ? 'danger' : 'gold'}
        />
        <StatCard
          label="Kanal Gateway"
          value={`${summary?.dokuCount ?? 0} DOKU`}
          sublabel={`${summary?.sandboxCount ?? 0} transaksi Sandbox lokal`}
          icon={<Webhook size={18} />}
          tone="neutral"
        />
      </div>

      <Card className="p-0 sm:p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setStatusFilter(opt.value);
                  setOffset(0);
                }}
                className={`min-h-[36px] px-3 rounded-[10px] text-xs font-semibold border transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-forest-dark border-slate-200 hover:bg-mint/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[210px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOffset(0);
                }}
                placeholder="Cari sesi, donor, atau ref…"
                className="w-full min-h-[38px] rounded-[10px] border border-slate-300 bg-white pl-8 pr-3 text-xs text-forest-dark outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => void paymentsQuery.refetch()}>
              <RefreshCw size={13} /> Segarkan
            </Button>
          </div>
        </div>

        {paymentsQuery.isPending ? (
          <div className="p-5">
            <Skeleton lines={7} />
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<CreditCard size={24} />}
              title="Belum ada sesi pembayaran cocok"
              description="Ubah filter status atau tunggu transaksi QRIS baru masuk."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Sesi QRIS</th>
                    <th className="px-4 py-3 font-semibold">Muzakki & Program</th>
                    <th className="px-4 py-3 font-semibold">Kanal</th>
                    <th className="px-4 py-3 font-semibold text-right">Nominal</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Waktu / Kedaluwarsa</th>
                    <th className="px-4 py-3 font-semibold text-right">Log Webhook</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const st = statusBadge(item.status === 'PAID' ? 'PAID' : item.status);
                    return (
                      <tr key={item.id} className="hover:bg-cream/60">
                        <td className="px-4 py-3 font-mono text-xs text-forest-dark">
                          <span className="font-semibold block">{item.payment_session_id}</span>
                          {item.provider_tx_id && (
                            <span className="text-[11px] text-slate-400">{item.provider_tx_id}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-forest-dark">
                            {item.donor_username || item.donor_name || 'Muzakki'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.campaign_title || item.program_id || 'Zakat Umum'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={item.channel === 'DOKU' ? 'primary' : 'neutral'}>{item.channel}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-forest-dark tabular-nums whitespace-nowrap">
                          {formatIDR(item.amount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          <span className="block">{formatDateTime(item.created_at)}</span>
                          {item.expires_at && (
                            <span className="text-[11px] text-slate-400">
                              Batas: {formatDateTime(item.expires_at)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedSessionId(item.payment_session_id)}
                          >
                            <Webhook size={13} /> Log Event
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar
              total={total}
              limit={limit}
              offset={offset}
              onOffsetChange={setOffset}
              onLimitChange={setLimit}
            />
          </>
        )}
      </Card>

      <SlideOverDrawer
        isOpen={Boolean(selectedSessionId)}
        onClose={() => setSelectedSessionId(null)}
        title="Log Event Webhook Pembayaran"
        subtitle={selectedSessionId ?? undefined}
      >
        {eventsQuery.isPending ? (
          <Skeleton lines={6} />
        ) : eventsQuery.isError ? (
          <ErrorState
            message="Gagal memuat daftar event webhook."
            retry={() => void eventsQuery.refetch()}
          />
        ) : (eventsQuery.data?.events.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Webhook size={24} />}
            title="Belum ada event settlement tercatat"
            description="Sesi ini belum menerima callback webhook DOKU atau konfirmasi sandbox."
          />
        ) : (
          <div className="space-y-3">
            {eventsQuery.data?.events.map((ev) => (
              <div key={ev.id} className="rounded-xl border border-slate-200 p-3.5 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone="primary" className="font-mono">{ev.event_type}</Badge>
                  <span className="font-mono text-[11px] text-slate-500">
                    {formatDateTime(ev.timestamp)}
                  </span>
                </div>
                {ev.provider_tx_id && (
                  <p className="font-mono text-[11px] text-forest-dark">
                    Ref Provider: <strong>{ev.provider_tx_id}</strong>
                  </p>
                )}
                {ev.payload && (
                  <pre className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[11px] font-mono text-slate-700 overflow-x-auto">
                    {ev.payload}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
};
