import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Database,
  ExternalLink,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import apiClient from '../utils/api';
import { formatDateTime, formatIDR, shortHash } from '../utils/format';
import { Badge, Button, Card, ON_CHAIN_NOTE, Skeleton, statusBadge } from '../components/ui';
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
  revoke_tx_hash?: string | null;
  revoke_reason?: string | null;
  allocations?: Array<{ region: string; amount: number }>;
}

interface TimelineStep {
  step: string;
  state: 'completed' | 'pending' | 'warning' | 'danger';
  timestamp: string | null;
  detail: string;
}

interface VerificationResponse {
  verified?: boolean;
  status: string;
  match?: boolean;
  donation_reference?: string;
  verdict?: {
    label: string;
    tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
    summary: string;
  };
  timeline?: TimelineStep[];
  network?: {
    chainId: number | null;
    networkName: string;
    contractAddress: string;
  };
  blockchain?: {
    exists: boolean;
    timestamp: string;
    revoked: boolean;
    formattedHash: string | null;
    unavailable: boolean;
  };
  data: VerificationData | null;
}

const VERDICT_BOX_STYLES: Record<string, string> = {
  success: 'border-emerald-200 bg-mint/70 text-forest-dark',
  danger: 'border-red-200 bg-red-50 text-red-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  info: 'border-sky/30 bg-sky/10 text-forest-dark',
  neutral: 'border-slate-200 bg-slate-50 text-slate-800',
};

const PublicVerify = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const network = useNetworkInfo();
  const urlQuery = searchParams.get('query') || searchParams.get('hash') || searchParams.get('id') || '';
  const [draftInput, setDraftInput] = useState<{ base: string; value: string } | null>(null);
  const inputValue = draftInput?.base === urlQuery ? draftInput.value : urlQuery;
  const activeQuery = urlQuery;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const verifyQuery = useQuery<VerificationResponse>({
    queryKey: ['public-verify', activeQuery],
    queryFn: async () => {
      const { data } = await apiClient.get<VerificationResponse>(
        `/explorer/verify/lookup/${encodeURIComponent(activeQuery.trim())}`
      );
      return data;
    },
    enabled: Boolean(activeQuery.trim()),
    retry: false,
  });

  const runSearch = (target: string) => {
    const cleaned = target.trim();
    if (!cleaned) return;
    setDraftInput({ base: cleaned, value: cleaned });
    if (cleaned === activeQuery.trim()) {
      void verifyQuery.refetch();
    } else {
      setSearchParams({ query: cleaned }, { replace: true });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(inputValue);
  };

  const copyText = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  const result = verifyQuery.data ?? null;
  const record = result?.data ?? null;
  const errObj = verifyQuery.error as { response?: { data?: { error?: string } } } | null;
  const error = verifyQuery.isError
    ? errObj?.response?.data?.error || 'Laporan tidak ditemukan atau format pencarian belum sesuai.'
    : null;

  const verdict = result?.verdict;
  const auditHash = record?.audit_hash ?? record?.auditHash ?? '';
  const activeChainId = result?.network?.chainId ?? network.chainId;
  const activeNetName = result?.network?.networkName || network.label;
  const explorerBase = explorerBaseForChain(activeChainId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <header className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-mint border border-primary/25 px-3 py-1 text-xs font-semibold text-forest">
          <EthereumLogo size={11} />
          <span>Verifikasi Laporan Terbuka</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-forest-dark">
          Cek Keabsahan Penyaluran Zakat
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Periksa apakah laporan penyaluran atau Bukti Setor Zakat Anda sudah tercatat utuh dan terverifikasi pada sistem.
        </p>
        <div className="flex justify-center pt-1">
          <NetworkBadge />
        </div>
      </header>

      <Card variant="highlight" className="p-6 sm:p-7">
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="verify-input" className="block text-xs uppercase tracking-[0.08em] text-forest-dark font-bold">
              Masukkan Nomor Laporan, Nomor BSZ, atau Kode Hash
            </label>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <button type="button" onClick={() => runSearch('1')} className="text-primary hover:underline">
                Contoh: Laporan #1
              </button>
              <button type="button" onClick={() => runSearch('2')} className="text-primary hover:underline">
                Laporan #2
              </button>
              <button type="button" onClick={() => runSearch('BSZ-2026-1')} className="text-primary hover:underline">
                BSZ-2026-1
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                id="verify-input"
                type="text"
                placeholder="Contoh: 1, BSZ-2026-1, atau kode sidik jari laporan"
                className="w-full min-h-[48px] bg-white rounded-[10px] border border-slate-300 pl-10 pr-4 text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary shadow-xs"
                value={inputValue}
                onChange={(e) => setDraftInput({ base: urlQuery, value: e.target.value })}
              />
            </div>
            <Button type="submit" variant="primary" size="lg" loading={verifyQuery.isFetching} disabled={!inputValue.trim()}>
              Cek Keabsahan
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Menampilkan putusan verifikasi berbahasa sederhana terlebih dahulu, diikuti rincian teknis opsional.
          </p>
        </form>
      </Card>

      {verifyQuery.isFetching && (
        <Card>
          <Skeleton lines={8} />
        </Card>
      )}

      {error && (
        <div role="alert" className="p-5 rounded-2xl border border-red-200 bg-red-50 text-red-800 flex items-start gap-3 text-sm">
          <AlertCircle size={20} className="shrink-0 mt-0.5 text-danger" />
          <div>
            <p className="font-bold">Laporan Tidak Ditemukan</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {result && verdict && (
        <Card className="space-y-6">
          {/* Putusan Bahasa Manusiawi Terlebih Dahulu */}
          <div className={`rounded-2xl border p-5 flex items-start gap-3.5 ${VERDICT_BOX_STYLES[verdict.tone] ?? VERDICT_BOX_STYLES.neutral}`}>
            <div className="mt-0.5 shrink-0">
              {verdict.tone === 'success' ? (
                <CheckCircle2 size={24} className="text-primary" />
              ) : verdict.tone === 'danger' ? (
                <ShieldAlert size={24} className="text-danger" />
              ) : (
                <ShieldCheck size={24} className="text-amber-700" />
              )}
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={verdict.tone === 'info' ? 'sky' : verdict.tone}>{verdict.label}</Badge>
                {result.donation_reference && (
                  <Badge tone="neutral">{result.donation_reference}</Badge>
                )}
              </div>
              <p className="text-sm font-medium leading-relaxed">{verdict.summary}</p>
            </div>
          </div>

          {record && (
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
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Wilayah Sasaran</p>
                <p className="mt-1 text-sm font-bold text-forest-dark">{record.region || 'Nasional'}</p>
              </div>
              <div className="bg-cream p-3.5 rounded-xl border border-slate-200/70">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Waktu Pencatatan</p>
                <p className="mt-1 text-xs font-semibold text-forest-dark">{formatDateTime(record.timestamp)}</p>
              </div>
            </div>
          )}

          {record?.allocations && record.allocations.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Rincian Alokasi Multi-Wilayah
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {record.allocations.map((al) => (
                  <div key={`${al.region}-${al.amount}`} className="flex items-center justify-between rounded-lg bg-cream px-3 py-2 text-xs">
                    <span className="font-semibold text-forest-dark">{al.region}</span>
                    <span className="font-bold text-primary tabular-nums">{formatIDR(al.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.timeline && result.timeline.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Alur Pemeriksaan Laporan
              </p>
              <ol className="grid sm:grid-cols-2 gap-3">
                {result.timeline.map((item) => (
                  <li key={item.step} className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        item.state === 'completed'
                          ? 'bg-mint text-primary'
                          : item.state === 'danger'
                            ? 'bg-red-100 text-danger'
                            : item.state === 'warning'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {item.state === 'completed' ? (
                        <CheckCircle2 size={14} />
                      ) : item.state === 'danger' ? (
                        <ShieldAlert size={14} />
                      ) : (
                        <Clock size={14} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-forest-dark">{item.step}</p>
                      <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="rounded-xl bg-cream border border-slate-200 p-3.5 text-xs text-slate-600">
            {ON_CHAIN_NOTE}
          </p>

          {/* Detail Kriptografi Opsional */}
          {record && (
            <details className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
              <summary className="cursor-pointer font-bold text-forest-dark flex items-center justify-between select-none">
                <span className="inline-flex items-center gap-2">
                  <Database size={14} className="text-primary" /> Detail Teknis Kriptografi (Opsional untuk Auditor &amp; Pengembang)
                </span>
                <ChevronDown size={15} className="text-slate-500" />
              </summary>

              <div className="mt-4 pt-3 border-t border-slate-200 grid sm:grid-cols-2 gap-3.5">
                <div>
                  <span className="text-slate-500 block mb-1">Status Basis Data &amp; Kontrak</span>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={statusBadge(record.blockchain_status || record.status).tone}>
                      {statusBadge(record.blockchain_status || record.status).label}
                    </Badge>
                    <Badge tone="neutral">Jaringan: {activeNetName}</Badge>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Alamat Smart Contract Target</span>
                  <span className="font-mono text-forest-dark break-all">
                    {shortHash(result.network?.contractAddress || network.contractAddress, 10, 6)}
                  </span>
                </div>

                {auditHash && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block mb-1">Audit Hash (SHA-256)</span>
                    <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <code className="font-mono text-forest-dark break-all">{auditHash}</code>
                      <button
                        type="button"
                        onClick={() => copyText('audit', auditHash)}
                        className="text-primary font-semibold inline-flex items-center gap-1 shrink-0"
                      >
                        <Copy size={12} /> {copiedKey === 'audit' ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>
                  </div>
                )}

                {record.tx_hash && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block mb-1">
                      Transaction Hash Ethereum {record.block_number ? `· Blok #${record.block_number}` : ''}
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <code className="font-mono text-forest-dark break-all">{record.tx_hash}</code>
                      {explorerBase && (
                        <a
                          href={`${explorerBase}/tx/${record.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary font-semibold inline-flex items-center gap-1 shrink-0 hover:underline"
                        >
                          Explorer <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}
        </Card>
      )}
    </div>
  );
};

export default PublicVerify;
