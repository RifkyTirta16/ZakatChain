import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Check, Copy, ExternalLink, Filter, Search } from 'lucide-react';
import apiClient from '../utils/api';
import { formatDateTime, formatIDR, shortHash } from '../utils/format';
import { Badge, Card, EmptyState, ErrorState, ON_CHAIN_NOTE, SectionHeader, Skeleton, proofBadge } from '../components/ui';
import { EthereumLogo, NetworkBadge, explorerBaseForChain, useNetworkInfo } from '../components/ethereum';

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
  network?: {
    chainId: number | null;
    networkName: string;
    contractAddress: string;
  };
  data: {
    id: number;
    amount: number;
    category: string | null;
    region: string | null;
    timestamp: string;
    audit_hash?: string | null;
    auditHash?: string | null;
    tx_hash: string | null;
    blockchain_status?: string | null;
    status?: string | null;
    block_number?: number | null;
  } | null;
}

const OnChainExplorer = () => {
  const network = useNetworkInfo();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<VerificationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const { data: transactions, isLoading, isError, refetch } = useQuery<Transaction[]>({
    queryKey: ['explorer-transactions'],
    queryFn: async () => {
      const { data } = await apiClient.get<Transaction[]>('/transactions');
      return Array.isArray(data) ? data : [];
    },
  });

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const verifyItem = async (tx: Transaction) => {
    setDetailLoading(true);
    setDetailError('');
    setSelectedDetail(null);
    try {
      const endpoint = tx.audit_hash
        ? `/explorer/verify/hash/${encodeURIComponent(tx.audit_hash)}`
        : `/explorer/verify/${encodeURIComponent(String(tx.id))}`;
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
  const statusOptions = Array.from(new Set(list.map((t) => t.blockchain_status).filter(Boolean))) as string[];

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
      <ErrorState
        message="Gagal memuat catatan transaksi on-chain. Periksa koneksi ke backend."
        retry={() => void refetch()}
      />
    );
  }

  const detailData = selectedDetail?.data ?? null;
  const detailNetName = selectedDetail?.network?.networkName || network.label;
  const detailChainId = selectedDetail?.network?.chainId ?? network.chainId;
  const detailExplorer = explorerBaseForChain(detailChainId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <SectionHeader
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mint border border-primary/25 px-3 py-1 text-xs font-semibold text-forest">
              <EthereumLogo size={11} /> Ethereum Explorer
            </span>
          }
          title="On-Chain Proof Explorer"
          subtitle="Penjelajah catatan hash audit penyaluran dan status pencatatannya pada smart contract Ethereum."
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <NetworkBadge compact />
          <div className="inline-flex items-center gap-2 bg-white px-3 py-2 rounded-[10px] border border-slate-300">
            <Filter size={14} className="text-slate-500" />
            <select
              aria-label="Filter status on-chain"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs sm:text-sm text-forest-dark font-medium outline-none cursor-pointer"
            >
              <option value="">Semua Status</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>{proofBadge(st).label}</option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[210px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Cari ID, hash, wilayah…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-h-[40px] bg-white rounded-[10px] border border-slate-300 pl-8 pr-3 text-xs sm:text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
        </div>
      </div>

      {detailLoading && (
        <Card>
          <Skeleton lines={4} />
        </Card>
      )}

      {detailError && (
        <div role="alert" className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm flex items-center gap-2 font-medium">
          <AlertCircle size={16} className="text-danger shrink-0" />
          <span>{detailError}</span>
        </div>
      )}

      {selectedDetail && detailData && (
        <Card variant="highlight" className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-forest-dark">
                Detail Verifikasi Transaksi #{detailData.id}
              </h2>
              <p className="text-xs text-slate-500">Jaringan: {detailNetName}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              className="text-xs font-semibold text-slate-600 hover:text-forest-dark"
            >
              Tutup
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Nominal</span>
              <span className="font-bold text-sm text-forest-dark tabular-nums">{formatIDR(detailData.amount)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Status Database</span>
              <Badge tone={proofBadge(detailData.blockchain_status ?? detailData.status ?? '').tone}>
                {proofBadge(detailData.blockchain_status ?? detailData.status ?? '').label}
              </Badge>
            </div>
            <div>
              <span className="text-slate-500 block">Status Smart Contract</span>
              <span className="font-bold text-forest-dark">{selectedDetail.status}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Waktu Pencatatan</span>
              <span className="font-mono">{formatDateTime(detailData.timestamp)}</span>
            </div>
          </div>

          <div className="p-3 bg-cream rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                Transaction Hash {detailData.block_number ? `· Blok #${detailData.block_number}` : ''}
              </span>
              {detailData.tx_hash && detailExplorer && (
                <a
                  href={`${detailExplorer}/tx/${detailData.tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  Etherscan <ExternalLink size={12} />
                </a>
              )}
            </div>
            <p className="font-mono font-bold text-forest-dark break-all">
              {detailData.tx_hash || 'Belum ada tx_hash on-chain'}
            </p>
          </div>
        </Card>
      )}

      <Card className="p-0 sm:p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6"><Skeleton lines={8} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Tidak ada catatan transaksi"
            description={
              searchTerm || statusFilter
                ? 'Tidak ada catatan transaksi yang cocok dengan filter.'
                : 'Belum ada transaksi distribusi yang tercatat.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Tx Hash Ethereum</th>
                  <th className="py-3.5 px-4">Audit Hash</th>
                  <th className="py-3.5 px-4">Kategori & Wilayah</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Blok</th>
                  <th className="py-3.5 px-4 text-right">Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => {
                  const isCopiedTx = copiedHash === t.tx_hash;
                  const isCopiedAudit = copiedHash === t.audit_hash;
                  return (
                    <tr key={t.id} className="hover:bg-cream/60">
                      <td className="py-3.5 px-4 font-mono font-bold text-forest-dark">#{t.id}</td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {t.tx_hash ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-forest-dark">{shortHash(t.tx_hash, 6, 4)}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(t.tx_hash!)}
                              aria-label="Salin tx hash"
                              className="p-1 rounded text-slate-400 hover:text-primary hover:bg-slate-100"
                            >
                              {isCopiedTx ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {t.audit_hash ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-600">{shortHash(t.audit_hash, 6, 4)}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(t.audit_hash!)}
                              aria-label="Salin audit hash"
                              className="p-1 rounded text-slate-400 hover:text-primary hover:bg-slate-100"
                            >
                              {isCopiedAudit ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-forest-dark block text-xs">{t.category || 'Umum'}</span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[160px]">
                          {t.region || 'Nasional'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge tone={proofBadge(t.blockchain_status ?? '').tone}>
                          {proofBadge(t.blockchain_status ?? '').label}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {t.block_number ? `#${t.block_number}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => void verifyItem(t)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[10px] border border-slate-300 text-xs font-semibold text-forest-dark hover:bg-mint hover:border-primary/40 transition-colors"
                        >
                          Periksa <ExternalLink size={11} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-cream border-t border-slate-100 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p>{ON_CHAIN_NOTE}</p>
          <span className="font-semibold text-slate-500 shrink-0">Total {filtered.length} rekaman</span>
        </div>
      </Card>
    </div>
  );
};

export default OnChainExplorer;
