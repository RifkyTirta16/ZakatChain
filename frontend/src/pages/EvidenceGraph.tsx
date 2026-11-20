import { useState, useEffect } from 'react';
import { Share2, ShieldCheck, X, Info } from 'lucide-react';
import apiClient from '../utils/api';
import { Badge, Card, EmptyState, Skeleton } from '../components/ui';
import { ON_CHAIN_NOTE } from '../components/ui/badgeStatus';
import { shortHash } from '../utils/format';

type GraphNode = {
  id: string;
  label: string;
  type: 'campaign' | 'donation' | 'distribution' | 'blockchain';
  color: string;
  txHash?: string;
  amount?: number;
  x?: number;
  y?: number;
};

type GraphLink = { source: string; target: string; type: string };

const NODE_COLORS: Record<GraphNode['type'], string> = {
  campaign: '#047857',
  donation: '#059669',
  distribution: '#C9A45C',
  blockchain: '#064E3B',
};

const NODE_TYPE_LABELS: Record<GraphNode['type'], string> = {
  campaign: 'Program Kampanye',
  donation: 'Donasi Masuk',
  distribution: 'Penyaluran Zakat',
  blockchain: 'Bukti Hash On-Chain',
};

const EvidenceGraph = () => {
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({
    nodes: [],
    links: [],
  });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const [campRes, donRes, txRes] = await Promise.allSettled([
          apiClient.get('/campaigns'),
          apiClient.get('/donations'),
          apiClient.get('/transactions'),
        ]);

        const asList = (result: PromiseSettledResult<{ data: unknown }>) => {
          if (result.status !== 'fulfilled') return [];
          const data = result.value.data as Record<string, unknown>;
          if (Array.isArray(data)) return data;
          if (Array.isArray(data?.data)) return data.data;
          if (Array.isArray(data?.transactions)) return data.transactions;
          if (Array.isArray(data?.donations)) return data.donations;
          return [];
        };

        const campaigns = asList(campRes);
        const donations = asList(donRes);
        const transactions = asList(txRes);

        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        campaigns.forEach((c: any) => {
          nodes.push({
            id: `camp_${c.id}`,
            label: c.title,
            type: 'campaign',
            color: NODE_COLORS.campaign,
          });
        });

        donations.forEach((d: any) => {
          nodes.push({
            id: `don_${d.id}`,
            label: `Donasi Rp ${Number(d.amount).toLocaleString('id-ID')}`,
            type: 'donation',
            amount: Number(d.amount),
            color: NODE_COLORS.donation,
          });
          if (d.campaign_id) {
            links.push({ source: `don_${d.id}`, target: `camp_${d.campaign_id}`, type: 'allocated_to' });
          }
        });

        transactions.forEach((t: any) => {
          nodes.push({
            id: `tx_${t.id}`,
            label: `Distribusi Rp ${Number(t.amount).toLocaleString('id-ID')}`,
            type: 'distribution',
            amount: Number(t.amount),
            color: NODE_COLORS.distribution,
          });

          if (t.category) {
            const matchingCamp = campaigns.find((c: any) =>
              String(c.title || '').toLowerCase().includes(String(t.category).toLowerCase())
            );
            if (matchingCamp) {
              links.push({ source: `tx_${t.id}`, target: `camp_${(matchingCamp as any).id}`, type: 'funded_by' });
            }
          }

          if (t.tx_hash) {
            nodes.push({
              id: `block_${t.tx_hash}`,
              label: `On-Chain: ${shortHash(t.tx_hash, 6, 4)}`,
              type: 'blockchain',
              color: NODE_COLORS.blockchain,
              txHash: t.tx_hash,
            });
            links.push({ source: `tx_${t.id}`, target: `block_${t.tx_hash}`, type: 'proven_by' });
          }
        });

        const nodeIds = new Set(nodes.map((node) => node.id));
        const visibleNodes = nodes.map((node, index) => {
          const angle = (2 * Math.PI * index) / Math.max(nodes.length, 1) - Math.PI / 2;
          const radius = nodes.length <= 1 ? 0 : Math.min(240, 90 + nodes.length * 11);
          return {
            ...node,
            x: 500 + Math.cos(angle) * radius,
            y: 350 + Math.sin(angle) * radius,
          };
        });

        setGraphData({
          nodes: visibleNodes,
          links: links.filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target)),
        });
      } catch (err) {
        console.error('Error building evidence graph:', err);
        setGraphData({ nodes: [], links: [] });
      } finally {
        setLoading(false);
      }
    };

    void fetchGraphData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Header Evidence Graph */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary-bg flex items-center justify-center text-primary">
                <Share2 size={22} />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-primary-dark">
                Evidence Traceability Graph
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-primary-dark/70">
              Pemetaan visual keterhubungan aliran dana zakat dari donasi hingga pencatatan hash on-chain.
            </p>
          </div>

          {/* Legenda Token Graf */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm text-xs font-semibold text-primary-dark">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.campaign }} />
              <span>Kampanye</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.donation }} />
              <span>Donasi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.distribution }} />
              <span>Penyaluran</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.blockchain }} />
              <span>On-Chain</span>
            </div>
          </div>
        </header>

        {/* Layout Graf di Tengah & Panel Detail di Kanan */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Graf Kanvas SVG di Tengah (lg:col-span-8) */}
          <div className="lg:col-span-8">
            <Card className="rounded-3xl p-0 overflow-hidden relative min-h-[440px] h-[650px] bg-white border border-slate-200/70 shadow-card">
              {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 space-y-3">
                  <Skeleton lines={5} className="w-3/4 rounded-xl" />
                  <p className="text-xs text-primary-dark/60 font-semibold animate-pulse">
                    Membangun jalinan bukti graf...
                  </p>
                </div>
              ) : graphData.nodes.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <EmptyState
                    icon={<Share2 size={44} className="text-primary" />}
                    title="Belum ada data untuk graf"
                    description="Kampanye, donasi, dan penyaluran akan terhubung secara dinamis di sini setelah transaksi tercatat."
                  />
                </div>
              ) : (
                <svg
                  className="h-full w-full"
                  viewBox="0 0 1000 700"
                  role="img"
                  aria-label="Evidence traceability graph"
                >
                  <defs>
                    <pattern id="graph-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1.5" fill="#E2E8F0" />
                    </pattern>
                  </defs>
                  <rect width="1000" height="700" fill="url(#graph-grid)" />

                  {/* Garis Penghubung (Links) */}
                  {graphData.links.map((link, index) => {
                    const source = graphData.nodes.find((node) => node.id === link.source);
                    const target = graphData.nodes.find((node) => node.id === link.target);
                    if (!source || !target) return null;
                    return (
                      <line
                        key={`${link.source}-${link.target}-${index}`}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="#94A3B8"
                        strokeWidth="2"
                        strokeDasharray={link.type === 'proven_by' ? '4 3' : undefined}
                        strokeOpacity="0.75"
                      />
                    );
                  })}

                  {/* Simpul (Nodes) */}
                  {graphData.nodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <g
                        key={node.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Pilih ${node.label}`}
                        onClick={() => setSelectedNode(node)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') setSelectedNode(node);
                        }}
                        className="cursor-pointer transition-transform hover:scale-105"
                      >
                        {/* Lingkaran Luar / Glow */}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={isSelected ? 32 : 26}
                          fill={node.color}
                          fillOpacity={isSelected ? 0.35 : 0.18}
                        />
                        {/* Lingkaran Inti */}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={isSelected ? 16 : 13}
                          fill={node.color}
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                        />
                        {/* Label Teks Simpul */}
                        <text
                          x={node.x}
                          y={(node.y || 0) + 38}
                          textAnchor="middle"
                          fill="#0F172A"
                          fontSize="12"
                          fontWeight="700"
                        >
                          {node.label.length > 22 ? `${node.label.slice(0, 19)}…` : node.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </Card>
          </div>

          {/* Panel Detail Node Saat Diklik (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-5">
            {selectedNode ? (
              <Card className="rounded-3xl p-6 bg-white border border-primary/30 shadow-card animate-in fade-in space-y-4">
                <div className="flex justify-between items-start gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-primary-dark/60 font-semibold block mb-0.5">
                      Detail Simpul
                    </span>
                    <h2 className="text-base font-extrabold text-primary-dark leading-snug">
                      {selectedNode.label}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedNode(null)}
                    aria-label="Tutup detail"
                    className="p-1.5 rounded-lg text-primary-dark/60 hover:text-primary-dark hover:bg-primary-bg"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-primary-bg/30 rounded-xl border border-primary-bg flex items-center justify-between">
                    <span className="text-primary-dark/70 font-medium">Tipe Simpul</span>
                    <Badge tone="primary">{NODE_TYPE_LABELS[selectedNode.type]}</Badge>
                  </div>

                  <div className="p-3 bg-cream/70 rounded-xl border border-cream space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-primary-dark/60 font-semibold block">
                      ID Simpul
                    </span>
                    <span className="font-mono font-bold text-primary-dark break-all">
                      {selectedNode.id}
                    </span>
                  </div>

                  {selectedNode.type === 'blockchain' && selectedNode.txHash && (
                    <div className="pt-2">
                      <a
                        href={`/verify?hash=${encodeURIComponent(selectedNode.txHash)}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-white hover:bg-forest rounded-[10px] text-xs font-semibold transition-colors"
                      >
                        <ShieldCheck size={14} /> Verifikasi di Portal Publik
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="rounded-3xl p-8 bg-white border border-slate-200/70 shadow-card text-center space-y-3">
                <div className="w-12 h-12 bg-primary-bg/50 rounded-2xl flex items-center justify-center text-primary-dark/50 mx-auto">
                  <Info size={24} />
                </div>
                <h3 className="text-sm font-extrabold text-primary-dark">Pilih Simpul Graf</h3>
                <p className="text-xs text-primary-dark/60 leading-relaxed">
                  Klik salah satu simpul pada graf kanvas untuk menelusuri rantai bukti dan memverifikasi integritas alur donasi.
                </p>
              </Card>
            )}

            {/* Catatan Integritas & Transparansi */}
            <Card className="rounded-3xl p-5 bg-white border border-slate-200/70 shadow-card space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-primary-dark/80 font-extrabold flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-primary" /> Integritas Rantai Bukti
              </h3>
              <p className="text-xs text-primary-dark/70 leading-relaxed">
                Graf ini menghubungkan secara kriptografis antara donasi yang masuk, program kampanye yang didanai, catatan penyaluran, hingga hash on-chain yang tercatat di blockchain.
              </p>
              <div className="pt-2 text-[11px] text-primary-dark/60 border-t border-slate-100">
                {ON_CHAIN_NOTE}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvidenceGraph;
