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
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;


export type ZakatContract = ethers.Contract & {
  owner(): Promise<string>;
  registerReport(reportHash: string | Uint8Array, reportId: bigint | number, overrides?: Record<string, unknown>): Promise<ethers.ContractTransactionResponse>;
  revokeReport(reportHash: string | Uint8Array, reason: string, overrides?: Record<string, unknown>): Promise<ethers.ContractTransactionResponse>;
  verifyReport(reportHash: string | Uint8Array): Promise<[boolean, bigint, boolean]>;
};

export const getBlockchainProvider = () => {
  return new ethers.JsonRpcProvider(
    process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545",
    undefined,
    { cacheTimeout: -1 }
  );
};

export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
};

let chainWriteTail: Promise<void> = Promise.resolve();

/**
 * Serializes on-chain writes in-process so concurrent API calls never collide
 * on the same wallet `pending` nonce.
 */
export const enqueueChainWrite = <T>(task: () => Promise<T>): Promise<T> => {
  const run = chainWriteTail.then(task, task);
  chainWriteTail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
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

let cachedProbe: { key: string; expiresAt: number; value: NetworkProbeResult } | null = null;

/**
 * Probes the configured JSON-RPC provider and ZakatVerify contract bytecode
 * with a strict timeout so unreachable nodes surface an explicit degraded state.
 * Caches briefly outside test mode to prevent page-navigation bursts from hammering RPC.
 */
export const probeNetworkStatus = async (timeoutMs = 2500): Promise<NetworkProbeResult> => {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
  const contractAddress = getContractAddress();
  const cacheKey = `${rpcUrl}|${contractAddress}`;
  const cacheEnabled = process.env.NODE_ENV !== 'test';
  if (cacheEnabled && cachedProbe && cachedProbe.key === cacheKey && cachedProbe.expiresAt > Date.now()) {
    return cachedProbe.value;
  }

  let provider: ReturnType<typeof getBlockchainProvider> | null = null;
  let result: NetworkProbeResult;
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
    result = {
      rpc: 'Connected',
      contract: contractActive ? 'Active' : 'No contract code',
      status: contractActive ? 'Healthy' : 'Degraded',
      chainId,
      networkName: resolveNetworkName(chainId),
      contractAddress,
      blockNumber,
    };
  } catch {
    result = {
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

  if (cacheEnabled) {
    cachedProbe = { key: cacheKey, expiresAt: Date.now() + 5000, value: result };
  }
  return result;
};

export interface BlockchainTelemetryResult {
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

export const getBlockchainTelemetry = async (db: any): Promise<BlockchainTelemetryResult> => {
  const contractAddress = getContractAddress();
  const countsRow = await db.get(
    `SELECT
       SUM(CASE WHEN COALESCE(blockchain_status, 'PENDING_BLOCKCHAIN') = 'PENDING_BLOCKCHAIN' AND COALESCE(proof_status, 'PENDING') != 'REJECTED' THEN 1 ELSE 0 END) AS pendingQueueCount,
       SUM(CASE WHEN blockchain_status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmedCount,
       SUM(CASE WHEN blockchain_status = 'REVOKED' THEN 1 ELSE 0 END) AS revokedCount
     FROM transactions`
  );

  let provider: ReturnType<typeof getBlockchainProvider> | null = null;
  const startedAt = Date.now();
  try {
    provider = getBlockchainProvider();
    const wallet = getBlockchainWallet(provider);
    const signerAddress = wallet ? await wallet.getAddress() : null;

    const [network, blockNumber, code, signerBalance] = await withTimeout(
      Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber(),
        contractAddress ? provider.getCode(contractAddress) : Promise.resolve('0x'),
        signerAddress ? provider.getBalance(signerAddress) : Promise.resolve(null),
      ]),
      3500,
      'telemetry probe'
    );

    const rpcLatencyMs = Date.now() - startedAt;
    const chainId = Number(network.chainId);
    const contractActive = Boolean(contractAddress && code && code !== '0x');

    let latestBlockTimestamp: string | null = null;
    try {
      const latestBlock = await withTimeout(provider.getBlock(blockNumber), 2000, 'getBlock');
      if (latestBlock?.timestamp) {
        latestBlockTimestamp = new Date(Number(latestBlock.timestamp) * 1000).toISOString();
      }
    } catch {
      // Optional metadata.
    }

    let contractOwner: string | null = null;
    if (contractActive) {
      try {
        const contract = getZakatContract(provider);
        contractOwner = await withTimeout(contract.owner(), 2000, 'contract.owner');
      } catch {
        // Ignore if contract view fails.
      }
    }

    const signerMatchesOwner =
      contractOwner && signerAddress
        ? contractOwner.toLowerCase() === signerAddress.toLowerCase()
        : null;

    return {
      rpc: 'Connected',
      contract: contractActive ? 'Active' : 'No contract code',
      status: contractActive && signerMatchesOwner !== false ? 'Healthy' : 'Degraded',
      chainId,
      networkName: resolveNetworkName(chainId),
      contractAddress,
      blockNumber,
      latestBlockTimestamp,
      rpcLatencyMs,
      contractOwner,
      signerAddress,
      signerBalanceEth: signerBalance !== null ? ethers.formatEther(signerBalance) : null,
      signerMatchesOwner,
      pendingQueueCount: Number(countsRow?.pendingQueueCount ?? 0),
      confirmedCount: Number(countsRow?.confirmedCount ?? 0),
      revokedCount: Number(countsRow?.revokedCount ?? 0),
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
      latestBlockTimestamp: null,
      rpcLatencyMs: null,
      contractOwner: null,
      signerAddress: null,
      signerBalanceEth: null,
      signerMatchesOwner: null,
      pendingQueueCount: Number(countsRow?.pendingQueueCount ?? 0),
      confirmedCount: Number(countsRow?.confirmedCount ?? 0),
      revokedCount: Number(countsRow?.revokedCount ?? 0),
    };
  } finally {
    provider?.destroy();
  }
};
