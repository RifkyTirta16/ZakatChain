
import { createPublicClient, http, type Chain } from 'viem';
import { hardhat, mainnet, sepolia } from 'viem/chains';

// Local Hardhat chain is the default; testnet/mainnet chains only activate when
// VITE_CHAIN_ID explicitly names them.
const CHAINS_BY_ID: Record<number, Chain> = {
  31337: hardhat,
  11155111: sepolia,
  1: mainnet,
};

export const DEFAULT_CHAIN_ID = 31337;
export const DEFAULT_RPC_URL = 'http://127.0.0.1:8545';

const envChainIds = String(import.meta.env.VITE_CHAIN_ID ?? '')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && CHAINS_BY_ID[value] !== undefined);

export const enabledChainIds: number[] = envChainIds.length > 0 ? envChainIds : [DEFAULT_CHAIN_ID];
export const chainFor = (id: number): Chain => CHAINS_BY_ID[id] ?? CHAINS_BY_ID[DEFAULT_CHAIN_ID];
export const RPC_URL = import.meta.env.VITE_RPC_URL || DEFAULT_RPC_URL;

export const publicClient = createPublicClient({
  chain: chainFor(enabledChainIds[0]),
  transport: http(RPC_URL),
});

export const ZAKAT_CONTRACT_ADDRESS = (import.meta.env.VITE_ZAKAT_CONTRACT_ADDRESS as `0x${string}`)
  || (import.meta.env.DEV ? '0x5FbDB2315678afecb367f032d93F642f64180aa3' : '0x0000000000000000000000000000000000000000');
