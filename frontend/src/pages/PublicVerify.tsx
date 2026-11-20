import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Search,
  ShieldCheck,
} from 'lucide-react';
import apiClient from '../utils/api';
import { formatDateTime, formatIDR, shortHash } from '../utils/format';
import { Badge, Button, Card, ON_CHAIN_NOTE, Skeleton, proofBadge } from '../components/ui';
import { EthereumLogo, NetworkBadge, explorerBaseForChain, useNetworkInfo } from '../components/ethereum';

interface VerificationData {
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
  proof_status?: string | null;
}

interface VerificationResponse {
  verified?: boolean;
  status: string;
  match?: boolean;
  network?: {
    chainId: number | null;
    networkName: string;
    contractAddress: string;
  };
  blockchain?: {
    exists: boolean;
    timestamp: string;
    revoked: boolean;
    formattedHash: string;
    unavailable: boolean;
  };
  data: VerificationData | null;
}

const getInitialQuery = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('query') || params.get('hash') || params.get('id') || '';
};

const PublicVerify = () => {
  const network = useNetworkInfo();
  const [reportId, setReportId] = useState(getInitialQuery);
  const [activeQuery, setActiveQuery] = useState(getInitialQuery);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const verifyQuery = useQuery<VerificationResponse>({
    queryKey: ['public-verify', activeQuery],
    queryFn: async () => {
      const cleaned = activeQuery.trim();
      const isHexHash = /^(0x)?[a-f0-9]{64}$/i.test(cleaned);
      const endpoint = isHexHash
        ? `/explorer/verify/hash/${encodeURIComponent(cleaned)}`
        : `/explorer/verify/${encodeURIComponent(cleaned)}`;
      const response = await apiClient.get<VerificationResponse>(endpoint);
      return response.data;
    },
    enabled: Boolean(activeQuery.trim()),
    retry: false,
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = reportId.trim();
    if (!cleaned) return;
    if (cleaned === activeQuery.trim()) {
      void verifyQuery.refetch();
    } else {
      setActiveQuery(cleaned);
    }
  };

  const result = verifyQuery.data ?? null;
  const loading = verifyQuery.isFetching;
  const errObj = verifyQuery.error as { response?: { data?: { error?: string } } } | null;
  const error = verifyQuery.isError
    ? errObj?.response?.data?.error || 'Laporan tidak ditemukan atau belum tercatat dalam sistem.'
    : null;

  const copyText = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const record = result?.data ?? null;
  const auditHash = record?.audit_hash ?? record?.auditHash ?? '';
  const chainStatus = record?.blockchain_status ?? record?.status ?? 'PENDING';
  const badge = proofBadge(chainStatus);
  const activeChainId = result?.network?.chainId ?? network.chainId;
  const activeNetName = result?.network?.networkName || network.label;
  const explorerBase = explorerBaseForChain(activeChainId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <header className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-mint border border-primary/25 px-3 py-1 text-xs font-semibold text-forest">
          <EthereumLogo size={11} />
          <span>Verifikasi Kriptografi Publik</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-forest-dark">
          Portal Verifikasi On-Chain
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Periksa keabsahan hash audit laporan penyaluran zakat di basis data dan smart contract{' '}
          <code className="font-mono text-forest">ZakatVerify</code>.
        </p>
        <div className="flex justify-center pt-1">
          <NetworkBadge />
        </div>
      </header>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleVerify} className="space-y-4">
          <label
            htmlFor="verify-input"
            className="block text-xs uppercase tracking-wider text-slateText font-bold"
          >
            Masukkan ID Laporan atau Hash Audit (64-hex / 0x…)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                id="verify-input"
                type="text"
                placeholder="Contoh: 1 atau hash audit 64 karakter hex"
                className="w-full min-h-[46px] bg-cream rounded-[10px] border border-slate-300 pl-10 pr-4 text-sm text-forest-dark font-mono outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
              />
            </div>
            <Button type="submit" variant="primary" loading={loading} disabled={!reportId.trim()}>
              Cek Keabsahan
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Menampilkan status di basis data serta hasil pemanggilan <code className="font-mono">verifyReport()</code> pada jaringan {network.label}.
          </p>
        </form>
      </Card>

      {loading && (
        <Card>
          <Skeleton lines={8} />
        </Card>
      )}

      {error && (
        <div
          role="alert"
          className="p-5 rounded-2xl border border-red-200 bg-red-50 text-red-800 flex items-start gap-3 text-sm"
        >
          <AlertCircle size={20} className="shrink-0 mt-0.5 text-danger" />
          <div>
            <p className="font-bold">Pemeriksaan Tidak Menemukan Data</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {result && record && (
        <Card className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-mint text-primary flex items-center justify-center">
                {result.status === 'VERIFIED' ? <CheckCircle2 size={20} /> : <ShieldCheck size={20} />}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-forest-dark">
                  Laporan Penyaluran #{record.id}
                </h2>
                <p className="text-xs text-slate-500">Jaringan Ethereum: {activeNetName}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={badge.tone}>{badge.label}</Badge>
              <Badge
                tone={
                  result.status === 'VERIFIED'
                    ? 'success'
                    : result.status === 'CHAIN_UNAVAILABLE'
                      ? 'warning'
                      : 'danger'
                }
              >
                Kontrak: {result.status}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-cream p-3.5 rounded-xl border border-slate-200/70">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Nominal Tercatat</p>
              <p className="mt-1 text-lg font-bold text-forest-dark tabular-nums">{formatIDR(record.amount)}</p>
            </div>
            <div className="bg-cream p-3.5 rounded-xl border border-slate-200/70">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Kategori</p>
              <p className="mt-1 text-sm font-bold text-forest-dark">{record.category || 'Umum'}</p>
            </div>
            <div className="bg-cream p-3.5 rounded-xl border border-slate-200/70">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Wilayah</p>
              <p className="mt-1 text-sm font-bold text-forest-dark">{record.region || 'Nasional'}</p>
            </div>
            <div className="bg-cream p-3.5 rounded-xl border border-slate-200/70">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Waktu Pencatatan</p>
              <p className="mt-1 text-xs font-mono font-semibold text-forest-dark">
                {formatDateTime(record.timestamp)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-slate-600 font-bold flex items-center gap-1.5">
              <Database size={15} className="text-primary" /> Rincian Kriptografi & Blockchain
            </h3>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Audit Hash (SHA-256)
                </p>
                {auditHash && (
                  <button
                    type="button"
                    onClick={() => copyText('audit', auditHash)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-forest"
                  >
                    <Copy size={13} /> {copiedKey === 'audit' ? 'Tersalin' : 'Salin'}
                  </button>
                )}
              </div>
              <p className="text-xs font-mono font-semibold text-forest-dark break-all">
                {auditHash || '-'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Transaction Hash Ethereum {record.block_number ? `· Blok #${record.block_number}` : ''}
                </p>
                <div className="flex items-center gap-3">
                  {record.tx_hash && (
                    <button
                      type="button"
                      onClick={() => copyText('tx', record.tx_hash!)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-forest"
                    >
                      <Copy size={13} /> {copiedKey === 'tx' ? 'Tersalin' : 'Salin'}
                    </button>
                  )}
                  {record.tx_hash && explorerBase && (
                    <a
                      href={`${explorerBase}/tx/${record.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-forest"
                    >
                      Etherscan <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
              <p className="text-xs font-mono font-semibold text-forest-dark break-all">
                {record.tx_hash || 'Belum tercatat on-chain (menunggu pengiriman ke node blockchain)'}
              </p>
            </div>

            {result.blockchain && (
              <div className="grid sm:grid-cols-3 gap-3 text-xs bg-mint/60 border border-primary/20 rounded-xl p-3.5">
                <div>
                  <span className="text-slate-500 block">Terdaftar di Kontrak</span>
                  <span className="font-bold text-forest-dark">
                    {result.blockchain.unavailable
                      ? 'Node tidak terjangkau'
                      : result.blockchain.exists
                        ? 'Ya (Valid On-Chain)'
                        : 'Belum Terdaftar'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status Pencabutan</span>
                  <span className="font-bold text-forest-dark">
                    {result.blockchain.revoked ? 'Dicabut (Revoked)' : 'Aktif'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Kontrak Target</span>
                  <span className="font-mono font-semibold text-forest-dark">
                    {shortHash(result.network?.contractAddress || network.contractAddress, 8, 6)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-cream border border-slate-200 p-3.5 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-forest-dark">{ON_CHAIN_NOTE}</p>
            <p>
              Identitas mustahik dilindungi demi menjaga kehormatan penerima manfaat sesuai prinsip syariah.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PublicVerify;
