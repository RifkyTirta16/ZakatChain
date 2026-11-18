import { Request, Response } from 'express';
import { getBlockchainProvider, getZakatContract } from '../utils/web3.js';
import { AnomalyResolutionSchema, formatIssues } from '../utils/validation.js';
import { ethers } from 'ethers';

interface DetectedIssue {
  transactionId: number;
  type: string;
  reason: string;
  priority: string;
}

export const scanForAnomalies = async (req: Request, res: Response) => {
  const { db } = req;
  let provider: ReturnType<typeof getBlockchainProvider> | null = null;
  try {
    const transactions = await (db as any).all('SELECT * FROM transactions');
    const detected: DetectedIssue[] = [];

    // Reuse a single provider/contract instance instead of building a new
    // JsonRpcProvider per transaction row.
    let contract: any = null;
    try {
      provider = getBlockchainProvider();
      contract = getZakatContract(provider);
    } catch (providerError: any) {
      console.error('[ANOMALY SCAN] Blockchain provider unavailable; skipping on-chain checks.');
    }

    for (const tx of transactions) {
      const issues: Omit<DetectedIssue, 'transactionId'>[] = [];

      // Rule 1: Missing Proof of Distribution
      if (!tx.proof_url) {
        issues.push({ type: 'MISSING_PROOF', reason: 'No proof of delivery file uploaded', priority: 'HIGH' });
      }

      // Rule 2: Blockchain Receipt Missing for Confirmed Status
      if (tx.blockchain_status === 'CONFIRMED' && !tx.tx_hash) {
        issues.push({ type: 'BLOCKCHAIN_RECEIPT_MISSING', reason: 'Status is CONFIRMED but no transaction hash found', priority: 'CRITICAL' });
      }

      // Rule 3: Proof Status Conflict (Approved but no File)
      if (tx.proof_status === 'APPROVED' && !tx.proof_url) {
        issues.push({ type: 'PROOF_CONFLICT', reason: 'Proof status is APPROVED but no file exists', priority: 'CRITICAL' });
      }

      // Rule 4: Database vs Blockchain Mismatch
      if (tx.tx_hash && tx.audit_hash && contract) {
        try {
          const formattedHash = ethers.id(tx.audit_hash);
          const reportInfo = await contract.verifyReport(formattedHash);

          if (!reportInfo[0]) {
            issues.push({ type: 'ON_CHAIN_MISSING', reason: 'Record exists in DB but not found on blockchain', priority: 'HIGH' });
          } else if (reportInfo[2]) {
            issues.push({ type: 'ON_CHAIN_REVOKED', reason: 'Blockchain record has been revoked', priority: 'MEDIUM' });
          }
        } catch {
          // An RPC failure is a system condition, not a data anomaly.
        }
      }

      // Rule 5: Transaction Duplication (same amount, recipient, and category
      // on the same day). Date-scoped so recurring monthly aid is not flagged.
      const duplicates = await (db as any).all(
        `SELECT id FROM transactions
         WHERE amount = ? AND recipient_name = ? AND category = ?
           AND id != ? AND date(timestamp) = date(?)
         LIMIT 1`,
        [tx.amount, tx.recipient_name, tx.category, tx.id, tx.timestamp]
      );
      if (duplicates.length > 0) {
        issues.push({
          type: 'POTENTIAL_DUPLICATE',
          reason: `Possible duplicate of transaction ID: ${duplicates[0].id} on the same day`,
          priority: 'MEDIUM',
        });
      }

      // Persist idempotently: skip issues already recorded as OPEN.
      for (const issue of issues) {
        const existing = await (db as any).get(
          `SELECT id FROM anomalies WHERE transaction_id = ? AND type = ? AND status = 'OPEN'`,
          [tx.id, issue.type]
        );
        if (!existing) {
          await (db as any).run(
            `INSERT INTO anomalies (transaction_id, type, reason, priority, status) VALUES (?, ?, ?, ?, ?)`,
            [tx.id, issue.type, issue.reason, issue.priority, 'OPEN']
          );
          detected.push({ transactionId: tx.id, ...issue });
        }
      }
    }

    // `detected` was previously never populated, so anomaliesFound was always 0.
    res.json({ message: 'Anomaly scan completed successfully', anomaliesFound: detected.length, anomalies: detected });
  } catch (error: any) {
    console.error('[ANOMALY SCAN ERROR]', error?.message);
    res.status(500).json({ error: 'Anomaly scan failed' });
  } finally {
    provider?.destroy();
  }
};

export const getAnomalies = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    // LEFT JOIN so an anomaly is never hidden by a missing transaction row.
    const anomalies = await (db as any).all(`
      SELECT a.*, t.recipient_name, t.amount
      FROM anomalies a
      LEFT JOIN transactions t ON a.transaction_id = t.id
      ORDER BY a.detected_at DESC, a.id DESC
    `);
    res.json(anomalies);
  } catch (error: any) {
    console.error('[GET ANOMALIES ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
};

export const resolveAnomaly = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { db } = req;

  if (!id || Array.isArray(id) || !/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({ error: 'A valid anomaly ID is required' });
  }

  const parsed = AnomalyResolutionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: formatIssues(parsed.error) });
  }
  const { status, follow_up } = parsed.data;

  try {
    const result = await (db as any).run(
      `UPDATE anomalies SET status = ?, follow_up = ? WHERE id = ?`,
      [status, follow_up ?? null, Number(id)]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }
    res.json({ message: 'Anomaly status updated' });
  } catch (error: any) {
    console.error('[RESOLVE ANOMALY ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to resolve anomaly' });
  }
};
