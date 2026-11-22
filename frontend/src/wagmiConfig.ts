
import { createConfig, http } from 'wagmi';
import type { Chain } from 'viem';
import { injected } from 'wagmi/connectors';
import { QueryClient } from '@tanstack/react-query';
import { chainFor, enabledChainIds, RPC_URL } from './web3';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Chains and transports follow VITE_CHAIN_ID / VITE_RPC_URL so the frontend and
// backend always target the same chain (default: local Hardhat).
const enabledChains = enabledChainIds.map(chainFor) as [Chain, ...Chain[]];

export const config = createConfig({
  chains: enabledChains,
  connectors: [injected()],
  transports: Object.fromEntries(enabledChains.map((chain) => [chain.id, http(RPC_URL)])),
});
