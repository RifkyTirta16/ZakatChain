import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Boxes, Check, Copy, Cpu, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime } from '../../utils/format';
import { Badge, Button, Card, ErrorState, ON_CHAIN_NOTE, SectionHeader, Skeleton, StatCard } from '../../components/ui';
import { EthereumLogo, NetworkBadge, useNetworkInfo } from '../../components/ethereum';
import { publicClient, RPC_URL, ZAKAT_CONTRACT_ADDRESS } from '../../web3';

interface BlockchainTelemetryResponse {
  rpc: 'Connected' | 'Unreachable' | 'Unknown';
  contract: 'Active' | 'No contract code' | 'Unknown';
  status: 'Healthy' | 'Degraded' | 'Unknown';
  chainId: number | null;
  networkName: string;
  contractAddress: string;
  blockNumber: number | null;
  latestBlockTimestamp: string | null;
  rpcLatencyMs: number | null;
  contractOwner: string | null;
  signerAddress: string | null;
  signerBalanceEth: string | null;
  signerMatchesOwner: boolean | null;
  pendingQueueCount: number;
  confirmedCount: number;
  revokedCount: number;
}

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

  const telemetryQuery = useQuery<BlockchainTelemetryResponse>({
    queryKey: ['admin-blockchain-telemetry'],
    queryFn: async () => {
      const { data } = await apiClient.get<BlockchainTelemetryResponse>('/admin/blockchain/telemetry');
      return data;
    },
    refetchInterval: 15_000,
  });

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

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const t = telemetryQuery.data;
  const activeContractAddress = t?.contractAddress || network.contractAddress;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Monitoring Jaringan, Signer & Smart Contract"
          subtitle="Telemetri real-time node JSON-RPC, kepemilikan ZakatVerify.owner(), saldo gas signer, latensi RPC, dan antrean on-chain."
        />
        <div className="flex items-center gap-2">
          <NetworkBadge compact />
          <Button
            variant="secondary"
            size="sm"
            loading={telemetryQuery.isFetching}
            onClick={() => {
              void network.refetch();
              void telemetryQuery.refetch();
            }}
          >
            <RefreshCw size={14} /> Segarkan Telemetri
          </Button>
        </div>
      </div>

      {telemetryQuery.isPending ? (
        <Skeleton lines={6} />
      ) : telemetryQuery.isError ? (
        <ErrorState
          message="Gagal memuat telemetri blockchain dari server."
          retry={() => void telemetryQuery.refetch()}
        />
      ) : t ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Latensi & RPC Node"
              value={t.rpcLatencyMs !== null ? `${t.rpcLatencyMs} ms` : 'Terputus'}
              sublabel={`${t.networkName} · RPC ${t.rpc}`}
              icon={<Activity size={18} />}
              tone={t.status === 'Healthy' ? 'emerald' : 'danger'}
            />
            <StatCard
              label="Blok Terbaru"
              value={t.blockNumber !== null ? `#${t.blockNumber}` : '-'}
              sublabel={t.latestBlockTimestamp ? formatDateTime(t.latestBlockTimestamp) : 'Waktu blok tidak tersedia'}
              icon={<Cpu size={18} />}
              tone="forest"
            />
            <StatCard
              label="Saldo Signer Backend"
              value={t.signerBalanceEth ? `${Number(t.signerBalanceEth).toFixed(4)} ETH` : '-'}
              sublabel={
                t.signerMatchesOwner === true
                  ? 'Cocok dengan owner() kontrak'
                  : t.signerMatchesOwner === false
                    ? 'PERHATIAN: Signer bukan owner()!'
                    : 'Status owner() belum terdeteksi'
              }
              icon={<Wallet size={18} />}
              tone={t.signerMatchesOwner === false ? 'danger' : 'gold'}
            />
            <StatCard
              label="Antrean Sinkronisasi"
              value={`${t.pendingQueueCount} Tertunda`}
              sublabel={`${t.confirmedCount} tercatat · ${t.revokedCount} dicabut`}
              icon={<Boxes size={18} />}
              tone={t.pendingQueueCount > 0 ? 'gold' : 'emerald'}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EthereumLogo size={14} />
                  <h2 className="text-base font-bold text-forest-dark">Status Node & Kepemilikan Kontrak</h2>
                </div>
                <Badge tone={t.status === 'Healthy' ? 'success' : t.status === 'Degraded' ? 'warning' : 'danger'}>
                  {t.status}
                </Badge>
              </div>

              <div className="space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Jaringan & Chain ID</span>
                  <span className="font-mono font-bold text-forest-dark">
                    {t.networkName} ({t.chainId ?? '-'})
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Bytecode Kontrak</span>
                  <span className="font-semibold text-forest-dark">{t.contract}</span>
                </div>
                <div className="flex justify-between gap-4 py-2 border-b border-slate-100">
                  <span className="text-slate-500 shrink-0">Owner Kontrak (owner())</span>
                  <span className="font-mono text-xs font-semibold text-forest-dark break-all text-right">
                    {t.contractOwner || '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-4 py-2 border-b border-slate-100">
                  <span className="text-slate-500 shrink-0">Alamat Signer Backend</span>
                  <span className="font-mono text-xs font-semibold text-forest-dark break-all text-right">
                    {t.signerAddress || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Verifikasi Kepemilikan</span>
                  {t.signerMatchesOwner === true ? (
                    <Badge tone="success">Cocok dengan Owner</Badge>
                  ) : t.signerMatchesOwner === false ? (
                    <Badge tone="danger">Tidak Cocok — Cek BLOCKCHAIN_PRIVATE_KEY</Badge>
                  ) : (
                    <Badge tone="warning">Belum Terverifikasi</Badge>
                  )}
                </div>
              </div>
            </Card>

            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-primary" />
                  <h2 className="text-base font-bold text-forest-dark">Konfigurasi Kontrak & Uji Browser</h2>
                </div>
                <Button variant="primary" size="sm" loading={probing} onClick={() => void probeBrowserRpc()}>
                  <Cpu size={14} /> Uji RPC Browser
                </Button>
              </div>

              <div className="rounded-xl bg-cream border border-slate-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                    Alamat Kontrak ZakatVerify
                  </span>
                  <button
                    type="button"
                    onClick={() => copyAddress(activeContractAddress)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    {copied ? (
                      <>
                        <Check size={12} /> Tersalin
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Salin
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-xs font-bold text-forest-dark break-all">{activeContractAddress}</p>
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
        </>
      ) : null}
    </div>
  );
};

export default NetworkMonitorPage;
