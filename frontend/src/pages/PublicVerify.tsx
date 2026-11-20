import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, AlertCircle, Database, CheckCircle2 } from 'lucide-react';
import apiClient from '../utils/api';
import { formatIDR, formatDateTime, shortHash } from '../utils/format';
import { Badge, Card, Skeleton } from '../components/ui';
import { proofBadge, ON_CHAIN_NOTE } from '../components/ui/badgeStatus';

interface VerificationData {
  id: number;
  amount: number;
  category: string;
  region: string;
  timestamp: string;
  audit_hash: string;
  tx_hash: string | null;
  blockchain_status: string;
  proof_status?: string;
  is_reconciled?: boolean;
}

interface VerificationResponse {
  status: string;
  data: VerificationData;
}

const PublicVerify = () => {
  const [reportId, setReportId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('query') || params.get('hash') || params.get('id') || '';
  });
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Otomatis verifikasi jika ada query param hash atau id dari navigasi ChainPanel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get('query') || params.get('hash') || params.get('id');
    if (queryParam) {
      void (async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
          const response = await apiClient.get<VerificationResponse>(`/explorer/verify/${encodeURIComponent(queryParam.trim())}`);
          setResult(response.data);
        } catch (err: unknown) {
          const e = err as { response?: { data?: { error?: string } } };
          setError(e.response?.data?.error || 'Laporan tidak ditemukan atau belum tercatat dalam sistem.');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, []);

  const executeVerify = async (queryTerm: string) => {
    if (!queryTerm.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await apiClient.get<VerificationResponse>(`/explorer/verify/${encodeURIComponent(queryTerm.trim())}`);
      setResult(response.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Laporan tidak ditemukan atau belum tercatat dalam sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeVerify(reportId);
  };

  return (
    <div className="min-h-screen bg-[#F6F8F8] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Verifikasi Publik */}
        <header className="text-center space-y-3">
          <div className="w-16 h-16 bg-primary-bg rounded-2xl flex items-center justify-center mx-auto text-primary shadow-teal-glow">
            <ShieldCheck size={36} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-dark">
            Portal Verifikasi Publik
          </h1>
          <p className="text-xs sm:text-sm text-primary-dark/70 max-w-xl mx-auto leading-relaxed">
            Pemeriksaan independen keabsahan hash audit dan rekaman transaksi on-chain penyaluran zakat.
          </p>
        </header>

        {/* Input Hash / ID Besar di Tengah */}
        <Card className="rounded-3xl p-6 sm:p-8 bg-white border border-slate-200/70 shadow-card">
          <form onSubmit={handleVerify} className="space-y-4">
            <label className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold mb-1">
              Masukkan ID Laporan atau Hash Transaksi On-Chain
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-dark/40" size={20} />
                <input
                  type="text"
                  placeholder="Contoh: 1, 0x12ab...89ef, atau hash audit SHA-256"
                  className="w-full min-h-[48px] bg-cream rounded-2xl border border-primary-bg pl-12 pr-4 text-sm sm:text-base text-primary-dark font-mono font-medium outline-none focus:ring-2 focus:ring-primary/20 placeholder-primary-dark/40"
                  value={reportId}
                  onChange={(e) => setReportId(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !reportId.trim()}
                className="inline-flex items-center justify-center min-h-[48px] px-8 rounded-full bg-gradient-to-br from-gold to-gold-light text-primary-dark font-bold text-sm shadow-gold-glow outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {loading ? 'Memeriksa...' : 'Cek Keabsahan'}
              </button>
            </div>
            <p className="text-[11px] text-primary-dark/60">
              Pencarian memeriksa basis data transaksi dan integritas catatan hash on-chain yang tidak dapat diubah.
            </p>
          </form>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card className="rounded-3xl p-8 bg-white border border-slate-200/70 shadow-card">
            <Skeleton lines={8} className="w-full rounded-2xl" />
          </Card>
        )}

        {/* Error State */}
        {error && (
          <div
            role="alert"
            className="p-5 rounded-2xl border border-coral/30 bg-coral/10 text-coral-dark flex items-start gap-3 text-xs sm:text-sm font-medium animate-in fade-in"
          >
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Pemeriksaan Gagal</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Hasil di Kartu dengan Badge + Catatan On-Chain */}
        {result && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Kartu Informasi Utama Laporan */}
            <Card className="rounded-3xl p-6 sm:p-8 bg-white border border-slate-200/70 shadow-card space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={22} className="text-success" />
                  <h2 className="text-xl font-extrabold text-primary-dark">
                    Laporan Penyaluran #{result.data.id}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={proofBadge(result.data.blockchain_status).tone}>
                    {proofBadge(result.data.blockchain_status).label}
                  </Badge>
                </div>
              </div>

              {/* Data Detail Distribusi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-primary-bg/30 p-3.5 rounded-xl border border-primary-bg">
                  <p className="text-[10px] uppercase tracking-wider text-primary-dark/60 font-semibold mb-1">
                    Nominal Tercatat
                  </p>
                  <p className="text-lg font-extrabold text-primary-dark tabular-nums">
                    {formatIDR(result.data.amount)}
                  </p>
                </div>

                <div className="bg-primary-bg/30 p-3.5 rounded-xl border border-primary-bg">
                  <p className="text-[10px] uppercase tracking-wider text-primary-dark/60 font-semibold mb-1">
                    Kategori
                  </p>
                  <p className="text-sm font-bold text-primary-dark">
                    {result.data.category || 'Umum'}
                  </p>
                </div>

                <div className="bg-primary-bg/30 p-3.5 rounded-xl border border-primary-bg">
                  <p className="text-[10px] uppercase tracking-wider text-primary-dark/60 font-semibold mb-1">
                    Wilayah Penyaluran
                  </p>
                  <p className="text-sm font-bold text-primary-dark">
                    {result.data.region || 'Nasional'}
                  </p>
                </div>

                <div className="bg-primary-bg/30 p-3.5 rounded-xl border border-primary-bg">
                  <p className="text-[10px] uppercase tracking-wider text-primary-dark/60 font-semibold mb-1">
                    Waktu Pencatatan
                  </p>
                  <p className="text-xs font-mono font-medium text-primary-dark/80">
                    {formatDateTime(result.data.timestamp)}
                  </p>
                </div>
              </div>

              {/* Bukti Integritas Hash */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs uppercase tracking-wider text-primary-dark/70 font-extrabold flex items-center gap-1.5">
                  <Database size={15} className="text-primary" /> Bukti Integritas Hash Kriptografi
                </h3>

                <div className="space-y-2.5">
                  <div className="p-3.5 bg-cream/70 rounded-xl border border-cream space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-primary-dark/60 font-semibold">
                      Audit Hash (SHA-256)
                    </p>
                    <p className="text-xs font-mono font-bold text-primary-dark break-all">
                      {result.data.audit_hash}
                    </p>
                  </div>

                  <div className="p-3.5 bg-cream/70 rounded-xl border border-cream space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-primary-dark/60 font-semibold">
                      Hash Transaksi Blockchain On-Chain
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-mono font-bold text-primary-dark break-all">
                        {result.data.tx_hash || 'Belum tercatat on-chain (menunggu rekonsiliasi node)'}
                      </p>
                      {result.data.tx_hash && (
                        <span className="text-xs text-primary font-semibold shrink-0">
                          {shortHash(result.data.tx_hash)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Catatan Wajib On-Chain & Privasi */}
              <div className="space-y-2 pt-2">
                <div className="bg-cream rounded-xl p-3 text-xs text-primary-dark/80 border border-cream font-medium">
                  {ON_CHAIN_NOTE}
                </div>
                <p className="text-[11px] text-primary-dark/60 leading-relaxed">
                  Identitas penerima manfaat dilindungi demi menjaga kehormatan mustahik sesuai prinsip privasi syariah. Publik dapat memverifikasi keabsahan data tanpa membuka data pribadi penerima.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicVerify;
