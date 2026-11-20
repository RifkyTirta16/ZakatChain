import { Request, Response } from 'express';
import {
  CONTRACT_ADDRESS,
  getBlockchainProvider,
  getZakatContract,
  resolveNetworkName,
} from '../utils/web3.js';
import { ethers } from 'ethers';

/**
 * Accepts either a bare 64-char audit hash or keccak/hex form optionally
 * prefixed with `0x`. OnChainExplorer.tsx routes anything starting with `0x`
 * to this endpoint, so rejecting the prefix made that path unusable.
 */
const normalizeHash = (value: string): string | null => {
  const stripped = value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
  if (!/^[a-f0-9]{64}$/i.test(stripped)) return null;
  return stripped.toLowerCase();
};

export const verifyReportProof = async (req: Request, res: Response) => {
  const id = typeof req.params.id === 'string' ? req.params.id : undefined;
  const hash = typeof req.params.hash === 'string' ? req.params.hash : undefined;
  const { db } = req;

  try {
    let targetHash: string | null = null;
    let dbInfo: any = null;

    if (hash) {
      targetHash = normalizeHash(hash);
      if (!targetHash) {
        return res.status(400).json({ error: 'Audit hash must be a 32-byte hexadecimal value' });
      }
      dbInfo = await (db as any).get('SELECT * FROM transactions WHERE audit_hash = ?', [targetHash]);
    } else {
      if (!id || !/^\d+$/.test(id) || Number(id) < 1) {
        return res.status(400).json({ error: 'A valid transaction ID or audit hash is required' });
      }
      dbInfo = await (db as any).get('SELECT * FROM transactions WHERE id = ?', [Number(id)]);
      if (!dbInfo) {
        return res.status(404).json({ error: 'Report not found in database' });
      }
      // Stored hashes may be either bare or 0x-prefixed depending on when the
      // record was written, so normalise before querying the chain.
      targetHash = normalizeHash(String(dbInfo.audit_hash ?? '')) ?? String(dbInfo.audit_hash ?? '');
    }

    if (typeof targetHash !== 'string' || targetHash.length === 0) {
      return res.status(400).json({ error: 'Report has no usable audit hash' });
    }

    const formattedHash = ethers.id(targetHash);

    let exists = false;
    let timestamp = 0n;
    let revoked = false;
    let chainUnavailable = false;
    let chainId: number | null = null;
    let provider: ReturnType<typeof getBlockchainProvider> | null = null;

    try {
      provider = getBlockchainProvider();
      const contract = getZakatContract(provider);
      const [reportInfo, network] = await Promise.all([
        contract.verifyReport(formattedHash),
        provider.getNetwork(),
      ]);
      exists = reportInfo[0];
      timestamp = reportInfo[1];
      revoked = reportInfo[2];
      chainId = Number(network.chainId);
    } catch (chainError: any) {
      // Surface an explicit "unknown" state instead of reporting NOT_FOUND,
      // which would be a false negative during an RPC outage.
      console.error(`[EXPLORER CHAIN ERROR] ${chainError?.message}`);
      chainUnavailable = true;
    } finally {
      provider?.destroy();
    }

    const status = chainUnavailable
      ? 'CHAIN_UNAVAILABLE'
      : exists
        ? (revoked ? 'REVOKED' : 'VERIFIED')
        : 'NOT_FOUND_ON_CHAIN';

    // `data` is what PublicVerify.tsx reads; `database` is retained for
    // OnChainExplorer.tsx. Both include snake_case & camelCase aliases.
    const database = dbInfo
      ? {
          id: dbInfo.id,
          amount: dbInfo.amount,
          category: dbInfo.category,
          region: dbInfo.region,
          timestamp: dbInfo.timestamp,
          status: dbInfo.blockchain_status,
          blockchain_status: dbInfo.blockchain_status,
          auditHash: dbInfo.audit_hash,
          audit_hash: dbInfo.audit_hash,
          tx_hash: dbInfo.tx_hash,
          block_number: dbInfo.block_number ?? null,
          proof_status: dbInfo.proof_status ?? null,
        }
      : null;

    return res.json({
      verified: !chainUnavailable && exists,
      verified_as: 'audit_hash_present_on_chain',
      network: {
        chainId,
        networkName: resolveNetworkName(chainId),
        contractAddress: CONTRACT_ADDRESS,
      },
      blockchain: {
        exists,
        timestamp: timestamp.toString(),
        revoked,
        formattedHash,
        unavailable: chainUnavailable,
      },
      database,
      data: database,
      match: exists && !!dbInfo && targetHash === String(dbInfo.audit_hash ?? '').replace(/^0x/i, '').toLowerCase(),
      status,
    });

  } catch (error: any) {
    console.error(`[EXPLORER ERROR] ${error?.message}`);
    res.status(500).json({ error: 'Blockchain verification failed' });
  }
};
