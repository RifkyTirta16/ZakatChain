import { useQuery } from '@tanstack/react-query';
import apiClient from '../../utils/api';

export interface BackendNetworkStatus {
  rpc?: string;
  contract?: string;
  status?: string;
  chainId?: number | null;
  networkName?: string;
  contractAddress?: string;
  blockNumber?: number | null;
}

const DEFAULT_CHAIN_ID = 31337;
const parsedChainIds = String(import.meta.env.VITE_CHAIN_ID ?? '')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value > 0);
const CONFIGURED_CHAIN_ID = parsedChainIds[0] ?? DEFAULT_CHAIN_ID;
const FALLBACK_CONTRACT_ADDRESS =
  (import.meta.env.VITE_ZAKAT_CONTRACT_ADDRESS as string | undefined) ||
  (import.meta.env.DEV
    ? '0x5FbDB2315678afecb367f032d93F642f64180aa3'
    : '0x0000000000000000000000000000000000000000');

export const chainLabelFromId = (chainId: number | null | undefined): string => {
  if (chainId === 31337) return 'Localhost / Hardhat';
  if (chainId === 11155111) return 'Sepolia Testnet';
  if (chainId === 1) return 'Ethereum Mainnet';
  if (typeof chainId === 'number' && Number.isFinite(chainId)) return `Ethereum Chain #${chainId}`;
  return 'Jaringan Tidak Tersedia';
};

export const explorerBaseForChain = (chainId: number | null | undefined): string | null => {
  if (chainId === 1) return 'https://etherscan.io';
  if (chainId === 11155111) return 'https://sepolia.etherscan.io';
  return null;
};

export interface PublicTransparencyPayload {
  kpis: {
    totalDonations: number;
    totalDistributed: number;
    balance: number;
    totalReports: number;
    verifiedReports: number;
    pendingReports: number;
    activeCampaigns: number;
  };
  governancePolicy?: {
    amilShareMaxPercent: number;
    netProgramMinPercent: number;
    gatewayFeeNote: string;
    allocationBasis: string;
    shariaReference: string;
  };
  integrityScorecard?: {
    approvedProofCount: number;
    revokedOrRejectedCount: number;
    resolvedAnomalyCount: number;
    openAnomalyCount: number;
    lastReconciliationStatus: string;
    lastReconciliationDate: string | null;
  };
  categoryDistribution: { category: string | null; total: number; count: number }[];
  recentTransactions: {
    id: number;
    amount: number;
    category: string | null;
    region: string | null;
    timestamp: string;
    audit_hash: string | null;
    tx_hash: string | null;
    blockchain_status: string | null;
    block_number: number | null;
    proof_status: string | null;
  }[];
  networkStatus: BackendNetworkStatus;
  disclaimer: string;
}

export const usePublicTransparency = () =>
  useQuery<PublicTransparencyPayload>({
    queryKey: ['public-transparency'],
    queryFn: async () => {
      const { data } = await apiClient.get<PublicTransparencyPayload>('/public/transparency');
      return data;
    },
    staleTime: 60_000,
    retry: 1,
  });

export const usePublicNetworkStatus = () =>
  useQuery<{ networkStatus: BackendNetworkStatus }>({
    queryKey: ['public-network-status'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ networkStatus: BackendNetworkStatus }>('/public/network');
      return data;
    },
    staleTime: 60_000,
    retry: 1,
  });

export const useNetworkInfo = () => {
  const query = usePublicNetworkStatus();
  const configuredChainId = CONFIGURED_CHAIN_ID;
  const backendNet = query.data?.networkStatus;

  const isLoading = query.isPending;
  const isReachable = backendNet?.rpc === 'Connected';
  const activeChainId = backendNet?.chainId ?? (isReachable ? configuredChainId : null);
  const label = isLoading
    ? 'Memeriksa jaringan…'
    : isReachable
      ? (backendNet?.networkName || chainLabelFromId(activeChainId))
      : `Node Offline (${chainLabelFromId(configuredChainId)})`;

  return {
    isLoading,
    isError: query.isError,
    isReachable,
    status: backendNet?.status ?? (query.isError ? 'Unavailable' : 'Unknown'),
    rpc: backendNet?.rpc ?? 'Unknown',
    contract: backendNet?.contract ?? 'Unknown',
    chainId: activeChainId,
    configuredChainId,
    configuredLabel: chainLabelFromId(configuredChainId),
    label,
    contractAddress: backendNet?.contractAddress || FALLBACK_CONTRACT_ADDRESS,
    blockNumber: backendNet?.blockNumber ?? null,
    explorerBaseUrl: explorerBaseForChain(activeChainId),
    refetch: query.refetch,
  };
};
