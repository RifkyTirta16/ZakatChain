import { useState } from 'react';
import { Check, Copy, Cpu, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, ON_CHAIN_NOTE, SectionHeader } from '../../components/ui';
import { EthereumLogo, NetworkBadge, useNetworkInfo } from '../../components/ethereum';
import { publicClient, RPC_URL, ZAKAT_CONTRACT_ADDRESS } from '../../web3';

const NetworkMonitorPage = () => {
  const network = useNetworkInfo();
  const [clientProbe, setClientProbe] = useState<{
    checkedAt: string;
    chainId: number | null;
    blockNumber: string | null;
    error?: string;
  } | null>(null);
  const [probing, setProbing] = useState(false);
  const [copied, setCopied] = useState(false);

  const probeBrowserRpc = async () => {
    setProbing(true);
    try {
      const [cid, blk] = await Promise.all([
        publicClient.getChainId(),
        publicClient.getBlockNumber(),
      ]);
      setClientProbe({
        checkedAt: new Date().toLocaleTimeString('id-ID'),
        chainId: cid,
        blockNumber: blk.toString(),
      });
    } catch {
      setClientProbe({
        checkedAt: new Date().toLocaleTimeString('id-ID'),
        chainId: null,
        blockNumber: null,
        error: `Node RPC frontend (${RPC_URL}) tidak dapat dihubungi dari browser.`,
      });
    } finally {
      setProbing(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(network.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Monitoring Jaringan & Smart Contract Ethereum"
          subtitle="Memantau kondisi aktual RPC node, Chain ID, dan bytecode kontrak ZakatVerify tanpa hardcoding Mainnet."
        />
        <div className="flex items-center gap-2">
          <NetworkBadge />
          <Button variant="secondary" size="sm" onClick={() => void network.refetch()}>
            <RefreshCw size={14} /> Segarkan Backend
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EthereumLogo size={14} />
              <h2 className="text-base font-bold text-forest-dark">Status Node Backend</h2>
            </div>
            <Badge
              tone={
                network.status === 'Healthy'
                  ? 'success'
                  : network.status === 'Degraded'
                    ? 'warning'
                    : 'danger'
              }
            >
              {network.status}
            </Badge>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Nama Jaringan Terdeteksi</span>
              <span className="font-bold text-forest-dark">{network.label}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Chain ID Aktif</span>
              <span className="font-mono font-bold text-forest-dark">{network.chainId ?? '-'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Status RPC</span>
              <span className="font-semibold text-forest-dark">{network.rpc}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Bytecode Kontrak</span>
              <span className="font-semibold text-forest-dark">{network.contract}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Tinggi Blok</span>
              <span className="font-mono font-semibold text-forest-dark">
                {network.blockNumber !== null ? `#${network.blockNumber}` : '-'}
              </span>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              <h2 className="text-base font-bold text-forest-dark">Konfigurasi Smart Contract & Klien</h2>
            </div>
            <Button variant="primary" size="sm" loading={probing} onClick={() => void probeBrowserRpc()}>
              <Cpu size={14} /> Uji Koneksi RPC Browser
            </Button>
          </div>

          <div className="rounded-xl bg-cream border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                Alamat Kontrak ZakatVerify
              </span>
              <button
                type="button"
                onClick={copyAddress}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
              >
                {copied ? <><Check size={12} /> Tersalin</> : <><Copy size={12} /> Salin</>}
              </button>
            </div>
            <p className="font-mono text-xs font-bold text-forest-dark break-all">
              {network.contractAddress}
            </p>
          </div>

          <div className="space-y-2 text-xs font-mono bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Frontend Target Chain</span>
              <span className="font-semibold text-forest-dark">
                {network.configuredLabel} ({network.configuredChainId})
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Frontend RPC URL</span>
              <span className="font-semibold text-forest-dark truncate max-w-[220px]">{RPC_URL}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Env Contract Address</span>
              <span className="font-semibold text-forest-dark truncate max-w-[220px]">
                {ZAKAT_CONTRACT_ADDRESS}
              </span>
            </div>
          </div>

          {clientProbe && (
            <div
              className={`rounded-xl p-3.5 text-xs border ${
                clientProbe.error
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-mint border-primary/25 text-forest'
              }`}
            >
              {clientProbe.error ? (
                <p>{clientProbe.error}</p>
              ) : (
                <p>
                  Pemeriksaan browser ({clientProbe.checkedAt}): terhubung ke Chain ID{' '}
                  <strong>{clientProbe.chainId}</strong> pada blok{' '}
                  <strong>#{clientProbe.blockNumber}</strong>.
                </p>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-500">{ON_CHAIN_NOTE}</p>
        </Card>
      </div>
    </div>
  );
};

export default NetworkMonitorPage;
