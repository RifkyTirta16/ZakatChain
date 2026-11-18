import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FilePlus, ClipboardList } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatIDR, formatDateTime } from '../../utils/format';
import { Badge, Card, EmptyState, ErrorState, Skeleton, proofBadge } from '../../components/ui';
import type { Transaction } from '../Dashboard';

const fetchTransactions = async (): Promise<Transaction[]> => {
  const { data } = await apiClient.get('/transactions');
  return data;
};

const isOpen = (t: Transaction): boolean =>
  t.proof_status === null || ['DRAFT', 'PENDING', 'PENDING_BLOCKCHAIN'].includes(t.proof_status);

const isRejected = (t: Transaction): boolean =>
  ['REJECTED', 'ANOMALY'].includes(t.proof_status ?? '') || t.anomaly_flag === 1;

const AmilHome = () => {
  const query = useQuery({
    queryKey: ['amil-transactions'],
    queryFn: fetchTransactions,
    refetchInterval: 30000,
  });

  const transactions = query.data ?? [];
  const open = transactions.filter(isOpen);
  const rejected = transactions.filter(isRejected);
  const recent = transactions.slice(0, 5);

  if (query.isError) {
    return (
      <ErrorState
        message="Gagal memuat catatan distribusi. Periksa koneksi ke server."
        retry={() => query.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary-dark mb-1">Antrean tugas</h1>
        <p className="text-primary-dark/70">Catatan distribusi yang menunggu tindakan Anda.</p>
      </div>

      {query.isPending ? (
        <Skeleton lines={6} className="w-full rounded-xl" />
      ) : transactions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList size={40} className="text-primary" />}
            title="Belum ada catatan distribusi"
            description="Mulai dengan membuat catatan distribusi pertama Anda."
            action={
              <Link
                to="/new-record"
                className="inline-flex items-center min-h-[44px] rounded-full bg-gradient-to-br from-gold to-gold-light px-6 font-bold text-sm text-primary-dark shadow-gold-glow"
              >
                <FilePlus size={16} className="mr-2" /> Buat catatan
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-primary-dark/70 mb-1">Menunggu proses</p>
              <p className="text-xl font-extrabold text-primary-dark">{open.length} laporan</p>
            </Card>
            <Card>
              <p className="text-sm text-primary-dark/70 mb-1">Perlu perbaikan</p>
              <p className="text-xl font-extrabold text-primary-dark">{rejected.length} laporan</p>
            </Card>
            <Card>
              <p className="text-sm text-primary-dark/70 mb-1">Total laporan</p>
              <p className="text-xl font-extrabold text-primary-dark">{transactions.length} laporan</p>
            </Card>
          </div>

          <Card>
            <h2 className="font-bold text-primary-dark mb-3">Laporan terakhir</h2>
            <div className="divide-y divide-dashed">
              {recent.map((t) => {
                const badge = proofBadge(t.proof_status ?? '');
                return (
                  <div key={t.id} className="py-3 flex items-center justify-between gap-2 text-sm">
                    <span className="text-primary-dark">
                      #{t.id} {t.recipient_name || '-'} · {formatIDR(Number(t.amount))} ·{' '}
                      {formatDateTime(t.timestamp)}
                    </span>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-primary-dark/70 mt-3">
              On-chain hanya membuktikan hash, bukan penerimaan di lapangan.
            </p>
          </Card>
        </>
      )}

      <Link
        to="/new-record"
        className="inline-flex items-center min-h-[44px] rounded-full bg-gradient-to-br from-gold to-gold-light px-6 font-bold text-sm text-primary-dark shadow-gold-glow outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <FilePlus size={16} className="mr-2" /> Buat catatan distribusi
      </Link>
    </div>
  );
};

export default AmilHome;
