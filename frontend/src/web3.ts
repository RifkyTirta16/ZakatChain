
import { createPublicClient, http } from 'viem';
import { hardhat } from 'viem/chains';

export const publicClient = createPublicClient({
  chain: hardhat,
  transport: http('http://127.0.0.1:8545'),
});

export const ZAKAT_CONTRACT_ADDRESS = (import.meta.env.VITE_ZAKAT_CONTRACT_ADDRESS as `0x${string}`) || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
export const ZAKAT_ABI = [
  {
    "inputs": [{ "internalType": "bytes32", "name": "reportHash", "type": "bytes32" }, { "internalType": "string", "name": "reportId", "type": "string" }],
    "name": "registerReport",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "reportHash", "type": "bytes32" }],
    "name": "verifyReport",
    "outputs": [
      { "internalType": "bool", "name": "exists", "type": "bool" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "internalType": "bool", "name": "revoked", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
