import { useState, useEffect } from 'react';
import { ExternalLink, Share2, ShieldCheck } from 'lucide-react';
import apiClient from '../utils/api';

type GraphNode = { id: string; label: string; type: string; color: string; txHash?: string; x?: number; y?: number };
type GraphLink = { source: string; target: string; type: string };

const EvidenceGraph = () => {
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const [campRes, donRes, txRes] = await Promise.allSettled([
          apiClient.get('/campaigns'),
          apiClient.get('/donations'),
          apiClient.get('/transactions'),
        ]);

        const asList = (result: PromiseSettledResult<any>) => {
          if (result.status !== 'fulfilled') return [];
          const data = result.value.data;
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
          nodes.push({ id: `camp_${c.id}`, label: c.title, type: 'campaign', color: '#00E5FF' });
        });

        donations.forEach((d: any) => {
          nodes.push({ id: `don_${d.id}`, label: `Donation Rp ${d.amount}`, type: 'donation', color: '#32D74B' });
          if (d.campaign_id) {
            links.push({ source: `don_${d.id}`, target: `camp_${d.campaign_id}`, type: 'allocated_to' });
          }
        });

        transactions.forEach((t: any) => {
          nodes.push({ id: `tx_${t.id}`, label: `Dist Rp ${t.amount}`, type: 'distribution', color: '#FFD60A' });
          
          if (t.category) {
            const matchingCamp = campaigns.find((c: any) => c.title.toLowerCase().includes(t.category.toLowerCase()));
            if (matchingCamp) {
              links.push({ source: `tx_${t.id}`, target: `camp_${matchingCamp.id}`, type: 'funded_by' });
            }
          }

          if (t.tx_hash) {
            nodes.push({ id: `block_${t.tx_hash}`, label: 'Blockchain Proof', type: 'blockchain', color: '#FF453A', txHash: t.tx_hash });
            links.push({ source: `tx_${t.id}`, target: `block_${t.tx_hash}`, type: 'proven_by' });
          }
        });

        const nodeIds = new Set(nodes.map((node) => node.id));
        const visibleNodes = nodes.map((node, index) => {
          const angle = (2 * Math.PI * index) / Math.max(nodes.length, 1) - Math.PI / 2;
          const radius = nodes.length <= 1 ? 0 : Math.min(245, 90 + nodes.length * 11);
          return { ...node, x: 500 + Math.cos(angle) * radius, y: 350 + Math.sin(angle) * radius };
        });
        setGraphData({ nodes: visibleNodes, links: links.filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target)) });
      } catch (err) {
        console.error('Error building evidence graph:', err);
        setGraphData({ nodes: [], links: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchGraphData();
  }, []);

  return (
    <div className="min-h-screen bg-wattvision-bg p-8 text-wattvision-textMain font-sans">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold uppercase italic tracking-tight">
            Evidence <span className="text-wattvision-primary">Graph</span>
          </h1>
          <p className="text-wattvision-textSecondary uppercase tracking-widest text-xs font-medium mt-1">Immutable Traceability Mapping</p>
        </div>
        <div className="flex gap-4 text-[10px] uppercase font-bold tracking-widest">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#00E5FF] rounded-full" /> Campaign</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#32D74B] rounded-full" /> Donation</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#FFD60A] rounded-full" /> Distribution</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#FF453A] rounded-full" /> Blockchain</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-9 bg-wattvision-surface border border-wattvision-border rounded-3xl overflow-hidden relative min-h-[420px] h-[700px] shadow-2xl">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-wattvision-primary font-mono animate-pulse">
              Computing Evidence Chain...
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Share2 size={44} className="text-wattvision-primary" />
              <p className="font-bold uppercase tracking-widest">Belum ada data untuk divisualisasikan</p>
              <p className="max-w-md text-xs leading-relaxed text-wattvision-textSecondary">Campaign, donasi, atau transaksi akan muncul di sini setelah tersedia. Pastikan backend berjalan dan data sudah dibuat.</p>
            </div>
          ) : (
            <svg className="h-full w-full" viewBox="0 0 1000 700" role="img" aria-label="Evidence traceability graph">
              <defs>
                <pattern id="graph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="#38383a" />
                </pattern>
              </defs>
              <rect width="1000" height="700" fill="url(#graph-grid)" />
              {graphData.links.map((link, index) => {
                const source = graphData.nodes.find((node) => node.id === link.source);
                const target = graphData.nodes.find((node) => node.id === link.target);
                if (!source || !target) return null;
                return <line key={`${link.source}-${link.target}-${index}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#59636b" strokeWidth="2" strokeOpacity="0.8" />;
              })}
              {graphData.nodes.map((node) => (
                <g key={node.id} role="button" tabIndex={0} aria-label={`Select ${node.label}`} onClick={() => setSelectedNode(node)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedNode(node); }} className="cursor-pointer">
                  <circle cx={node.x} cy={node.y} r="25" fill={node.color} fillOpacity="0.16" />
                  <circle cx={node.x} cy={node.y} r="12" fill={node.color} stroke="#fff" strokeOpacity="0.6" strokeWidth="2" />
                  <text x={node.x} y={(node.y || 0) + 42} textAnchor="middle" fill="#f5f5f7" fontSize="13" fontWeight="600">{node.label.length > 24 ? `${node.label.slice(0, 21)}…` : node.label}</text>
                </g>
              ))}
            </svg>
          )}
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedNode ? (
            <div className="bg-wattvision-surface border border-wattvision-border p-6 rounded-3xl shadow-xl animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-lg font-bold uppercase italic leading-tight">{selectedNode.label}</h2>
                <button onClick={() => setSelectedNode(null)} className="text-wattvision-textSecondary hover:text-white">✕</button>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-wattvision-bg rounded-xl border border-wattvision-border">
                  <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mb-1">Node Type</p>
                  <p className="text-xs font-bold uppercase">{selectedNode.type}</p>
                </div>
                {selectedNode.type === 'blockchain' && selectedNode.txHash && (
                  <a 
                    href={`https://etherscan.io/tx/${selectedNode.txHash}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-center gap-2 w-full py-3 bg-wattvision-primary text-black rounded-xl text-xs uppercase font-bold hover:bg-cyan-400 transition-all"
                  >
                    <ExternalLink size={14} /> View on Etherscan
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-wattvision-surface border border-wattvision-border p-8 rounded-3xl text-center h-full flex flex-col items-center justify-center space-y-4 opacity-50">
              <Share2 size={48} className="text-wattvision-textSecondary" />
              <p className="text-wattvision-textSecondary text-sm uppercase tracking-widest">Select a node to trace the evidence chain</p>
            </div>
          )}
          
          <div className="bg-wattvision-surface border border-wattvision-border p-6 rounded-3xl shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-wattvision-primary" /> Integrity Note
            </h3>
            <p className="text-[11px] text-wattvision-textSecondary leading-relaxed">
              The graph visually links physical distributions to their immutable blockchain proofs. A broken link indicates a missing verification step.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvidenceGraph;