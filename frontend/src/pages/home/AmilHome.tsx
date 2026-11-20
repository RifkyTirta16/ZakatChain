import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ClipboardList, FilePlus, Map, Megaphone } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime, formatIDR } from '../../utils/format';
import {
  Badge,
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

const isOpen = (t: Transaction): boolean =>
  t.proof_status === null || ['DRAFT', 'PENDING', 'PENDING_BLOCKCHAIN'].includes(t.proof_status);

const isRejected = (t: Transaction): boolean =>
  ['REJECTED', 'ANOMALY'].includes(t.proof_status ?? '') || t.anomaly_flag === 1;

const AmilHome = () => {
  const query = useQuery<Transaction[]>({
    queryKey: ['amil-transactions'],
    queryFn: async () => {
      const { data } = await apiClient.get<Transaction[]>('/transactions');
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30_000,
  });

  const transactions = query.data ?? [];
  const open = transactions.filter(isOpen);
  const rejected = transactions.filter(isRejected);
  const totalDistributed = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const recent = transactions.slice(0, 6);

  if (query.isError) {
    return (
      <ErrorState
        message="Gagal memuat catatan distribusi Amil. Periksa koneksi ke server."
        retry={() => void query.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Operasional Amil Zakat"
          subtitle="Kelola pencatatan penyaluran, bukti dokumen, program zakat, dan pemetaan mustahik."
        />
        <Link
          to="/new-record"
          className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-[10px] bg-primary px-5 text-sm font-semibold text-white hover:bg-forest shadow-teal-glow shrink-0"
        >
          <FilePlus size={16} /> Catat Distribusi Baru
        </Link>
      </div>

      {query.isPending ? (
        <Skeleton lines={8} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Tersalurkan (Tercatat)"
              value={formatIDR(totalDistributed)}
              icon={<ClipboardList size={18} />}
              tone="emerald"
            />
            <StatCard
              label="Menunggu Review / Proses"
              value={`${open.length} laporan`}
              icon={<FilePlus size={18} />}
              tone="gold"
            />
            <StatCard
              label="Perlu Perbaikan / Ditolak"
              value={`${rejected.length} laporan`}
              icon={<AlertTriangle size={18} />}
              tone={rejected.length > 0 ? 'danger' : 'neutral'}
            />
            <StatCard
              label="Total Catatan Distribusi"
              value={`${transactions.length} laporan`}
              icon={<Megaphone size={18} />}
              tone="forest"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Link to="/new-record" className="block">
              <Card className="hover:shadow-elevated transition-shadow flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-mint text-primary flex items-center justify-center shrink-0">
                  <FilePlus size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-dark">Catat Distribusi</p>
                  <p className="text-xs text-slate-500">Unggah bukti penyaluran baru</p>
                </div>
              </Card>
            </Link>
            <Link to="/campaigns" className="block">
              <Card className="hover:shadow-elevated transition-shadow flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/20 text-amber-900 flex items-center justify-center shrink-0">
                  <Megaphone size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-dark">Kelola Program</p>
                  <p className="text-xs text-slate-500">Buat & pantau program zakat</p>
                </div>
              </Card>
            </Link>
            <Link to="/mapping" className="block">
              <Card className="hover:shadow-elevated transition-shadow flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
                  <Map size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-forest-dark">Pemetaan Kemiskinan</p>
                  <p className="text-xs text-slate-500">Prioritas wilayah & impor data</p>
                </div>
              </Card>
            </Link>
          </div>

          <Card className="p-0 sm:p-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-forest-dark">Laporan Penyaluran Terbaru</h2>
              <Link to="/explorer" className="text-xs font-semibold text-primary hover:underline">
                Buka Explorer →
              </Link>
            </div>
            {recent.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={24} />}
                title="Belum ada catatan distribusi"
                description="Mulai dengan mencatat penyaluran dana zakat pertama Anda."
                action={
                  <Link
                    to="/new-record"
                    className="inline-flex items-center min-h-[40px] rounded-[10px] bg-primary px-4 text-xs font-semibold text-white"
                  >
                    Catat Distribusi
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recent.map((t) => {
                  const badge = proofBadge(t.proof_status ?? t.blockchain_status ?? 'PENDING');
                  return (
                    <div key={t.id} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="font-semibold text-forest-dark">
                          #{t.id} {t.recipient_name || 'Mustahik'} · {t.category || 'Umum'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t.region || 'Nasional'} · {formatDateTime(t.timestamp)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-forest-dark tabular-nums">
                          {formatIDR(Number(t.amount))}
                        </span>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-5 py-3 bg-cream border-t border-slate-100 text-xs text-slate-500">
              {ON_CHAIN_NOTE}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default AmilHome;
