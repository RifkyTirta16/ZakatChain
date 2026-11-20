// Local Hardhat-only utility: replays CONFIRMED and REVOKED distribution audit
// hashes from SQLite onto a freshly restarted local Hardhat ZakatVerify contract.
// Refuses to run outside local chainId 31337 / localhost RPC.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ethers } from 'ethers';
import { initDb } from './models/db.js';
import { CONTRACT_ABI, getContractAddress } from './utils/web3.js';

const isLocalRpc = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  } catch {
    return false;
  }
};

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('[SYNC LOCAL CHAIN] Ditolak di NODE_ENV=production.');
    process.exit(1);
  }

  const backendEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
  dotenv.config({ path: backendEnvPath });

  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL?.trim() || 'http://127.0.0.1:8545';
  const contractAddress = getContractAddress();

  if (!isLocalRpc(rpcUrl)) {
    console.error(`[SYNC LOCAL CHAIN] Ditolak: RPC bukan localhost (${rpcUrl}).`);
    process.exit(1);
  }
  if (!contractAddress) {
    console.error('[SYNC LOCAL CHAIN] ZAKAT_CONTRACT_ADDRESS tidak terkonfigurasi.');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  try {
    const network = await provider.getNetwork();
    if (network.chainId !== 31337n) {
      console.error(`[SYNC LOCAL CHAIN] Ditolak: hanya untuk Hardhat chainId 31337 (terdeteksi ${network.chainId}).`);
      process.exit(1);
    }

    const code = await provider.getCode(contractAddress);
    if (!code || code === '0x') {
      console.error(`[SYNC LOCAL CHAIN] Bytecode kontrak kosong di ${contractAddress}. Deploy ZakatVerify terlebih dahulu.`);
      process.exit(1);
    }

    const signer = process.env.BLOCKCHAIN_PRIVATE_KEY?.trim()
      ? new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY.trim(), provider)
      : await provider.getSigner(0);
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

    const db = await initDb();
    try {
      const rows: Array<{
        id: number;
        audit_hash: string | null;
        blockchain_status: string | null;
        revoke_reason: string | null;
      }> = await db.all(
        `SELECT id, audit_hash, blockchain_status, revoke_reason
         FROM transactions
         WHERE audit_hash IS NOT NULL
           AND blockchain_status IN ('CONFIRMED', 'REVOKED')
         ORDER BY id ASC`
      );

      let restored = 0;
      let revokedRestored = 0;

      for (const row of rows) {
        if (!row.audit_hash) continue;
        const formattedHash = ethers.id(row.audit_hash);
        const [exists, , isRevoked]: [boolean, bigint, boolean] = await contract.verifyReport(formattedHash);

        if (!exists) {
          const tx = await contract.registerReport(formattedHash, row.id);
          const receipt = await tx.wait();
          if (receipt && receipt.status === 1) {
            await db.run(
              'UPDATE transactions SET tx_hash = ?, block_number = ? WHERE id = ?',
              [tx.hash, receipt.blockNumber, row.id]
            );
            restored += 1;
          }
        }

        if (row.blockchain_status === 'REVOKED' && !isRevoked) {
          const revokeTx = await contract.revokeReport(
            formattedHash,
            row.revoke_reason || 'Dicabut sesuai arsip lokal'
          );
          const revokeReceipt = await revokeTx.wait();
          if (revokeReceipt && revokeReceipt.status === 1) {
            await db.run(
              'UPDATE transactions SET revoke_tx_hash = ? WHERE id = ?',
              [revokeTx.hash, row.id]
            );
            revokedRestored += 1;
          }
        }
      }

      console.log(
        `[SYNC LOCAL CHAIN] Selesai: ${restored} laporan dipulihkan ke kontrak ${contractAddress}${revokedRestored > 0 ? `, ${revokedRestored} status revoke disinkronkan` : ''}.`
      );
    } finally {
      await db.close();
    }
  } finally {
    provider.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('[SYNC LOCAL CHAIN ERROR]', error instanceof Error ? error.message : 'unknown error');
  process.exit(1);
});
