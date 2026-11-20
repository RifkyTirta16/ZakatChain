import { ethers } from 'ethers';

const DEV_FALLBACK_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

/**
 * Returns the configured contract address. Falls back to the local Hardhat
 * deterministic address only outside production so production misconfiguration
 * fails loudly instead of silently querying a local dev address.
 */
export const getContractAddress = (): string => {
  const configured = process.env.ZAKAT_CONTRACT_ADDRESS?.trim();
  if (configured) return configured;
  return process.env.NODE_ENV === 'production' ? '' : DEV_FALLBACK_CONTRACT_ADDRESS;
};

export const CONTRACT_ADDRESS = getContractAddress();
export const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "bytes32", "name": "reportHash", "type": "bytes32" },
      { "internalType": "uint256", "name": "reportId", "type": "uint256" }
    ],
    "name": "registerReport",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "reportHash", "type": "bytes32" }
    ],
    "name": "verifyReport",
    "outputs": [
      { "internalType": "bool", "name": "exists", "type": "bool" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "internalType": "bool", "name": "revoked", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "reportHash", "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "reportId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "ReportRegistered",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "reportHash", "type": "bytes32" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "revokeReport",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "reportHash", "type": "bytes32" },
      { "indexed": false, "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "ReportRevoked",
    "type": "event"
  }
] as const;


export type ZakatContract = ethers.Contract & {
  registerReport(reportHash: string | Uint8Array, reportId: bigint | number, overrides?: Record<string, unknown>): Promise<ethers.ContractTransactionResponse>;
  revokeReport(reportHash: string | Uint8Array, reason: string, overrides?: Record<string, unknown>): Promise<ethers.ContractTransactionResponse>;
  verifyReport(reportHash: string | Uint8Array): Promise<[boolean, bigint, boolean]>;
};

export const getBlockchainProvider = () => {
  return new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545");
};

export const getBlockchainWallet = (provider: ethers.Provider) => {
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  if (!privateKey) return null;
  try {
    return new ethers.Wallet(privateKey, provider);
  } catch {
    throw new Error('BLOCKCHAIN_PRIVATE_KEY is invalid');
  }
};

export const getZakatContract = (provider: ethers.Provider): ZakatContract => {
  const address = getContractAddress();
  if (!address) {
    throw new Error('ZAKAT_CONTRACT_ADDRESS is not configured');
  }
  return new ethers.Contract(address, CONTRACT_ABI, provider) as unknown as ZakatContract;
};

export interface NetworkProbeResult {
  rpc: 'Connected' | 'Unreachable' | 'Unknown';
  contract: 'Active' | 'No contract code' | 'Unknown';
  status: 'Healthy' | 'Degraded' | 'Unknown';
  chainId: number | null;
  networkName: string;
  contractAddress: string;
  blockNumber: number | null;
}

export const resolveNetworkName = (chainId: number | null | undefined): string => {
  if (chainId === 31337) return 'Localhost / Hardhat';
  if (chainId === 11155111) return 'Sepolia Testnet';
  if (chainId === 1) return 'Ethereum Mainnet';
  if (typeof chainId === 'number' && Number.isFinite(chainId)) return `Ethereum Chain #${chainId}`;
  return 'Jaringan Tidak Tersedia';
};

/**
 * Probes the configured JSON-RPC provider and ZakatVerify contract bytecode
 * with a strict timeout so unreachable nodes surface an explicit degraded state.
 */
export const probeNetworkStatus = async (timeoutMs = 2500): Promise<NetworkProbeResult> => {
  const contractAddress = getContractAddress();
  let provider: ReturnType<typeof getBlockchainProvider> | null = null;
  try {
    provider = getBlockchainProvider();
    const probe = (async () => {
      const [network, blockNumber, code] = await Promise.all([
        provider!.getNetwork(),
        provider!.getBlockNumber(),
        contractAddress ? provider!.getCode(contractAddress) : Promise.resolve('0x'),
      ]);
      const chainId = Number(network.chainId);
      return { chainId, blockNumber, code };
    })();

    const { chainId, blockNumber, code } = await Promise.race([
      probe,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('RPC probe timed out')), timeoutMs)),
    ]);

    const contractActive = Boolean(contractAddress && code && code !== '0x');
    return {
      rpc: 'Connected',
      contract: contractActive ? 'Active' : 'No contract code',
      status: contractActive ? 'Healthy' : 'Degraded',
      chainId,
      networkName: resolveNetworkName(chainId),
      contractAddress,
      blockNumber,
    };
  } catch {
    return {
      rpc: 'Unreachable',
      contract: 'Unknown',
      status: 'Degraded',
      chainId: null,
      networkName: 'Jaringan Tidak Tersedia',
      contractAddress,
      blockNumber: null,
    };
  } finally {
    provider?.destroy();
  }
};
