import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ExternalLink, Info, Share2, ShieldCheck } from 'lucide-react';
import apiClient from '../utils/api';
import { Badge, Card, EmptyState, ErrorState, Select, Skeleton, statusBadge } from '../components/ui';
import { ON_CHAIN_NOTE } from '../components/ui/badgeStatus';
import { formatIDR, shortHash } from '../utils/format';

interface GraphCampaign {
  id: number;
  title: string;
  status?: string;
}

interface GraphDonation {
  id: number;
  amount: number | string;
  status: string;
  campaign_id?: number | null;
}

interface GraphTransaction {
  id: number;
  amount: number | string;
  campaign_id?: number | null;
  category?: string | null;
  region?: string | null;
  audit_hash?: string | null;
  tx_hash?: string | null;
  blockchain_status?: string | null;
  proof_status?: string | null;
}

const EvidenceGraph = () => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  const query = useQuery({
    queryKey: ['evidence-graph-data'],
    queryFn: async () => {
      const [campRes, donRes, txRes] = await Promise.all([
        apiClient.get<GraphCampaign[]>('/campaigns'),
        apiClient.get<GraphDonation[]>('/donations'),
        apiClient.get<GraphTransaction[]>('/transactions'),
      ]);
      return {
        campaigns: Array.isArray(campRes.data) ? campRes.data : [],
        donations: Array.isArray(donRes.data) ? donRes.data : [],
        transactions: Array.isArray(txRes.data) ? txRes.data : [],
      };
    },
  });

  const filtered = useMemo(() => {
    const data = query.data;
    if (!data) return { campaigns: [], donations: [], transactions: [] };
    if (!selectedCampaignId) return data;

    const filterVal = selectedCampaignId === 'GENERAL' ? null : Number(selectedCampaignId);
    return {
      campaigns:
        filterVal === null ? [] : data.campaigns.filter((c) => c.id === filterVal),
      donations: data.donations.filter((d) => (d.campaign_id ?? null) === filterVal),
      transactions: data.transactions.filter((t) => (t.campaign_id ?? null) === filterVal),
    };
  }, [query.data, selectedCampaignId]);

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton lines={3} />
        <Skeleton lines={10} />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        message="Gagal memuat alur jejak bukti program, donasi, dan catatan on-chain."
        retry={() => void query.refetch()}
      />
    );
  }

  const allCampaigns = query.data?.campaigns ?? [];
  const confirmedDonations = filtered.donations.filter((d) => d.status === 'CONFIRMED');
  const activeTxs = filtered.transactions;
  const onChainTxs = activeTxs.filter((t) => Boolean(t.audit_hash || t.tx_hash));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-forest-dark flex items-center gap-2.5">
            <Share2 size={24} className="text-primary" /> Alur Jejak Bukti Dana (Lineage)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Telusuri keterkaitan antara program zakat, donasi terkonfirmasi, laporan penyaluran, dan sidik jari hash on-chain.
          </p>
        </div>

        <div className="w-full md:w-72">
          <Select
            aria-label="Filter program"
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            options={[
              { value: '', label: 'Semua Pool & Program' },
              { value: 'GENERAL', label: 'Zakat Umum (Non-Program)' },
              ...allCampaigns.map((c) => ({ value: String(c.id), label: c.title })),
            ]}
          />
        </div>
      </div>

      <div className="rounded-xl bg-mint/60 border border-primary/20 px-4 py-3 text-xs text-forest flex items-start gap-2">
        <Info size={15} className="text-primary shrink-0 mt-0.5" />
        <span>{ON_CHAIN_NOTE}</span>
      </div>

      {allCampaigns.length === 0 && activeTxs.length === 0 ? (
        <EmptyState
          title="Belum ada data relasi"
          description="Catat donasi atau laporan penyaluran untuk menampilkan alur jejak dana."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-4 items-start">
          {/* Kolom 1: Program */}
          <Card className="space-y-3 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-forest-dark">
                1. Program ({selectedCampaignId === 'GENERAL' ? 1 : filtered.campaigns.length})
              </span>
              <ArrowRight size={14} className="text-slate-400 hidden lg:block" />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {selectedCampaignId === 'GENERAL' ? (
                <div className="rounded-xl border border-primary/25 bg-mint/40 p-3 text-xs font-semibold text-forest-dark">
                  Zakat Umum (Pool Kemiskinan Nasional)
                </div>
              ) : filtered.campaigns.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">Tidak ada program cocok.</p>
              ) : (
                filtered.campaigns.map((c) => (
                  <Link
                    key={c.id}
                    to={`/campaigns/${c.id}`}
                    className="block rounded-xl border border-slate-200 bg-cream/60 p-3 hover:bg-mint/50 transition-colors"
                  >
                    <p className="text-xs font-bold text-forest-dark line-clamp-2">{c.title}</p>
                    <Badge tone={statusBadge(c.status || 'ACTIVE').tone} className="mt-1.5">
                      {statusBadge(c.status || 'ACTIVE').label}
                    </Badge>
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Kolom 2: Donasi Masuk */}
          <Card className="space-y-3 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-forest-dark">
                2. Donasi Lunas ({confirmedDonations.length})
              </span>
              <ArrowRight size={14} className="text-slate-400 hidden lg:block" />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {confirmedDonations.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">Belum ada donasi terkonfirmasi.</p>
              ) : (
                confirmedDonations.slice(0, 20).map((d) => (
                  <div key={d.id} className="rounded-xl border border-slate-200 bg-emerald-50/40 p-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-semibold text-slate-500">DON #{d.id}</span>
                      <span className="font-bold text-forest-dark tabular-nums">
                        {formatIDR(Number(d.amount))}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Kolom 3: Laporan Penyaluran */}
          <Card className="space-y-3 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-forest-dark">
                3. Penyaluran ({activeTxs.length})
              </span>
              <ArrowRight size={14} className="text-slate-400 hidden lg:block" />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {activeTxs.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">Belum ada laporan penyaluran.</p>
              ) : (
                activeTxs.slice(0, 20).map((t) => {
                  const st = statusBadge(t.blockchain_status || t.proof_status || 'PENDING');
                  return (
                    <div key={t.id} className="rounded-xl border border-slate-200 bg-gold/10 p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-forest-dark">Laporan #{t.id}</span>
                        <span className="font-bold text-forest-dark tabular-nums">
                          {formatIDR(Number(t.amount))}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">{t.region || t.category || 'Umum'}</p>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Kolom 4: Catatan Hash Ethereum */}
          <Card className="space-y-3 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-forest-dark flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-primary" /> 4. Hash On-Chain ({onChainTxs.length})
              </span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {onChainTxs.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">Belum ada laporan dengan hash audit.</p>
              ) : (
                onChainTxs.slice(0, 20).map((t) => {
                  const verifyTarget = t.audit_hash || t.tx_hash || String(t.id);
                  return (
                    <Link
                      key={t.id}
                      to={`/verify?query=${encodeURIComponent(verifyTarget)}`}
                      className="block rounded-xl border border-slate-200 bg-forest-dark text-white p-3 space-y-1.5 hover:bg-forest transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-gold-light">#{t.id}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/80">
                          Cek Bukti <ExternalLink size={11} />
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-white/80 truncate">
                        Hash: {shortHash(t.audit_hash || t.tx_hash, 8, 6)}
                      </p>
                    </Link>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EvidenceGraph;
