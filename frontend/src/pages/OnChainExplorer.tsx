import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Boxes, Copy, Check, Filter, ExternalLink, AlertCircle } from 'lucide-react';
import apiClient from '../utils/api';
import { formatIDR, formatDateTime, shortHash } from '../utils/format';
import { Badge, Card, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { proofBadge, ON_CHAIN_NOTE } from '../components/ui/badgeStatus';

interface Transaction {
  id: number;
  amount: number;
  category: string | null;
  region: string | null;
  timestamp: string;
  tx_hash: string | null;
  audit_hash: string | null;
  blockchain_status: string | null;
  block_number: number | null;
}

interface VerificationDetail {
  status: string;
  data: {
    id: number;
    amount: number;
    category: string;
    region: string;
    timestamp: string;
    audit_hash: string;
    tx_hash: string | null;
    blockchain_status: string;
  };
}

const fetchTransactions = async (): Promise<Transaction[]> => {
  const { data } = await apiClient.get<Transaction[]>('/transactions');
  return Array.isArray(data) ? data : [];
};

const OnChainExplorer = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<VerificationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const { data: transactions, isLoading, isError, refetch } = useQuery({
    queryKey: ['explorer-transactions'],
    queryFn: fetchTransactions,
  });

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const verifyItem = async (queryTerm: string) => {
    if (!queryTerm) return;
    setDetailLoading(true);
    setDetailError('');
    setSelectedDetail(null);
    try {
      const endpoint = queryTerm.startsWith('0x')
        ? `/explorer/verify/hash/${encodeURIComponent(queryTerm)}`
        : `/explorer/verify/${encodeURIComponent(queryTerm)}`;
      const { data } = await apiClient.get<VerificationDetail>(endpoint);
      setSelectedDetail(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setDetailError(e.response?.data?.error || 'Gagal memverifikasi catatan on-chain.');
    } finally {
      setDetailLoading(false);
    }
  };

  const list = transactions ?? [];
  const statusOptions = Array.from(
    new Set(list.map((t) => t.blockchain_status).filter(Boolean))
  ) as string[];

  const filtered = list.filter((t) => {
    const matchStatus = statusFilter ? t.blockchain_status === statusFilter : true;
    const term = searchTerm.toLowerCase().trim();
    const matchSearch = term
      ? String(t.id).includes(term) ||
        (t.tx_hash && t.tx_hash.toLowerCase().includes(term)) ||
        (t.audit_hash && t.audit_hash.toLowerCase().includes(term)) ||
        (t.category && t.category.toLowerCase().includes(term)) ||
        (t.region && t.region.toLowerCase().includes(term))
      : true;
    return matchStatus && matchSearch;
  });

  if (isError) {
    return (
      <div className="min-h-screen bg-[#F6F8F8] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            message="Gagal memuat catatan transaksi on-chain. Periksa koneksi ke backend."
            retry={() => void refetch()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8F8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Explorer */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary-bg flex items-center justify-center text-primary">
                <Boxes size={22} />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-primary-dark">
                On-Chain Proof Explorer
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-primary-dark/70">
              Penjelajah transaksi on-chain untuk memverifikasi pencatatan hash audit secara transparan.
            </p>
          </div>

          {/* Filter Status & Pencarian */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-sm">
              <Filter size={15} className="text-primary-dark/60" />
              <select
                aria-label="Filter status on-chain"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs sm:text-sm text-primary-dark font-medium outline-none cursor-pointer"
              >
                <option value="">Semua Status</option>
                {statusOptions.map((st) => (
                  <option key={st} value={st}>
                    {proofBadge(st).label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-dark/40" size={15} />
              <input
                type="text"
                placeholder="Cari ID, hash, wilayah..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-h-[40px] bg-white rounded-xl border border-slate-200/80 pl-9 pr-3 text-xs sm:text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20 placeholder-primary-dark/40"
              />
            </div>
          </div>
        </header>

        {/* Modal / Panel Detail Verifikasi jika diklik */}
        {detailLoading && (
          <Card className="rounded-2xl p-6 bg-white border border-slate-200/70 shadow-card">
            <Skeleton lines={4} className="w-full rounded-xl" />
          </Card>
        )}

        {detailError && (
          <div
            role="alert"
            className="p-4 rounded-2xl border border-coral/30 bg-coral/10 text-coral-dark text-xs sm:text-sm flex items-center gap-2 font-medium"
          >
            <AlertCircle size={16} />
            <span>{detailError}</span>
          </div>
        )}

        {selectedDetail && (
          <Card className="rounded-2xl p-6 bg-white border border-primary/30 shadow-card space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-primary-dark">
                Hasil Verifikasi Detail: #{selectedDetail.data.id}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="text-xs font-bold text-primary-dark/60 hover:text-primary-dark"
              >
                Tutup
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-primary-dark/60 block">Nominal Tercatat:</span>
                <span className="font-extrabold text-sm">{formatIDR(selectedDetail.data.amount)}</span>
              </div>
              <div>
                <span className="text-primary-dark/60 block">Status On-Chain:</span>
                <Badge tone={proofBadge(selectedDetail.data.blockchain_status).tone}>
                  {proofBadge(selectedDetail.data.blockchain_status).label}
                </Badge>
              </div>
              <div>
                <span className="text-primary-dark/60 block">Waktu Pencatatan:</span>
                <span className="font-mono">{formatDateTime(selectedDetail.data.timestamp)}</span>
              </div>
            </div>
            <div className="p-3 bg-cream/70 rounded-xl border border-cream text-xs space-y-1">
              <span className="text-primary-dark/60 block text-[10px] uppercase tracking-wider font-semibold">
                Hash Transaksi:
              </span>
              <span className="font-mono font-bold break-all">{selectedDetail.data.tx_hash || 'Belum ada tx_hash on-chain'}</span>
            </div>
          </Card>
        )}

        {/* Tabel Hash Terpotong + Tombol Salin */}
        <Card className="rounded-2xl p-0 bg-white border border-slate-200/70 shadow-card overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <Skeleton lines={8} className="w-full rounded-xl" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Tidak ada catatan transaksi"
                description={
                  searchTerm || statusFilter
                    ? 'Tidak ada data transaksi yang cocok dengan filter pencarian.'
                    : 'Belum ada transaksi distribusi yang tercatat.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-primary-bg/50 border-b border-primary-bg/80 text-[11px] uppercase tracking-wider text-primary-dark/70 font-bold">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Hash On-Chain (Tx)</th>
                    <th className="py-3 px-4">Audit Hash (SHA-256)</th>
                    <th className="py-3 px-4">Kategori & Wilayah</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Blok</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((t) => {
                    const isCopiedTx = copiedHash === t.tx_hash;
                    const isCopiedAudit = copiedHash === t.audit_hash;

                    return (
                      <tr key={t.id} className="hover:bg-primary-bg/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-primary-dark">
                          #{t.id}
                        </td>

                        {/* Hash Transaksi Terpotong + Tombol Salin */}
                        <td className="py-3.5 px-4 font-mono text-xs">
                          {t.tx_hash ? (
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[130px] font-semibold text-primary-dark">
                                {shortHash(t.tx_hash, 6, 4)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(t.tx_hash!)}
                                title={isCopiedTx ? 'Tersalin' : 'Salin tx hash'}
                                className="p-1 rounded text-primary-dark/60 hover:text-primary hover:bg-primary-bg"
                              >
                                {isCopiedTx ? (
                                  <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                                    <Check size={11} /> Salin
                                  </span>
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-primary-dark/40 italic">-</span>
                          )}
                        </td>

                        {/* Audit Hash Terpotong + Tombol Salin */}
                        <td className="py-3.5 px-4 font-mono text-xs">
                          {t.audit_hash ? (
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[130px] text-primary-dark/80">
                                {shortHash(t.audit_hash, 6, 4)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(t.audit_hash!)}
                                title={isCopiedAudit ? 'Tersalin' : 'Salin audit hash'}
                                className="p-1 rounded text-primary-dark/60 hover:text-primary hover:bg-primary-bg"
                              >
                                {isCopiedAudit ? (
                                  <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                                    <Check size={11} /> Salin
                                  </span>
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-primary-dark/40 italic">-</span>
                          )}
                        </td>

                        {/* Kategori & Wilayah */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-primary-dark block text-xs">
                            {t.category || 'Umum'}
                          </span>
                          <span className="text-[11px] text-primary-dark/60 block truncate max-w-[160px]">
                            {t.region || 'Nasional'}
                          </span>
                        </td>

                        {/* Status On-Chain */}
                        <td className="py-3.5 px-4">
                          <Badge tone={proofBadge(t.blockchain_status ?? '').tone} className="text-xs">
                            {proofBadge(t.blockchain_status ?? '').label}
                          </Badge>
                        </td>

                        {/* Nomor Blok */}
                        <td className="py-3.5 px-4 font-mono text-xs text-primary-dark/70">
                          {t.block_number ? `#${t.block_number}` : '-'}
                        </td>

                        {/* Aksi Cek Detail */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => void verifyItem(t.tx_hash || String(t.id))}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary text-xs font-bold text-primary-dark hover:bg-primary-bg transition-colors"
                          >
                            Cek <ExternalLink size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Catatan Transparansi On-Chain */}
          <div className="p-4 bg-cream/60 border-t border-slate-100 text-xs text-primary-dark/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-[11px] font-medium leading-relaxed">
              <span className="font-bold">{ON_CHAIN_NOTE}.</span> Data tabel memuat bukti hash kriptografis yang tersinkronisasi dengan kontrak cerdas.
            </p>
            <span className="text-[11px] font-bold text-primary-dark/50 shrink-0">
              Total {filtered.length} rekaman
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OnChainExplorer;
