import { useQuery } from '@tanstack/react-query';
import apiClient from '../../utils/api';
import { enabledChainIds, ZAKAT_CONTRACT_ADDRESS } from '../../web3';

export interface BackendNetworkStatus {
  rpc?: string;
  contract?: string;
  status?: string;
  chainId?: number | null;
  networkName?: string;
  contractAddress?: string;
  blockNumber?: number | null;
}

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
    staleTime: 30_000,
    retry: 1,
  });

export const useNetworkInfo = () => {
  const query = usePublicTransparency();
  const configuredChainId = enabledChainIds[0] ?? 31337;
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
    contractAddress: backendNet?.contractAddress || ZAKAT_CONTRACT_ADDRESS,
    blockNumber: backendNet?.blockNumber ?? null,
    explorerBaseUrl: explorerBaseForChain(activeChainId),
    refetch: query.refetch,
  };
};
