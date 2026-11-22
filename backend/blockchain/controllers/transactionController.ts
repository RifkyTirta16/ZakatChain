
import { Request, Response } from 'express';
import { generateRecordAuditHash } from '../utils/crypto.js';
import { RevokeReportSchema, TransactionSchema, formatIssues } from '../utils/validation.js';
import { getBlockchainProvider, getBlockchainWallet, getZakatContract } from '../utils/web3.js';
import { persistUpload, removeUpload } from '../middleware/upload.js';
import { runInTransaction } from '../models/db.js';
import { logActivity } from '../utils/auditLogger.js';
import { ethers } from 'ethers';

/** Escape LIKE wildcards so a search term is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (match) => `\\${match}`);

export const getTransactions = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const { search, category, region, status } = req.query;

    const conditions: string[] = [];
    const params: (string | number | null)[] = [];

    if (typeof search === 'string' && search.trim()) {
      const term = `%${escapeLike(search.trim())}%`;
      conditions.push(
        "(t.recipient_name LIKE ? ESCAPE '\\' OR t.donor_name LIKE ? ESCAPE '\\' OR t.audit_hash LIKE ? ESCAPE '\\')"
      );
      params.push(term, term, term);
    }
    if (typeof category === 'string' && category.trim()) {
      conditions.push("t.category = ?");
      params.push(category.trim());
    }
    if (typeof region === 'string' && region.trim()) {
      conditions.push("t.region = ?");
      params.push(region.trim());
    }
    if (typeof status === 'string' && status.trim()) {
      conditions.push("t.blockchain_status = ?");
      params.push(status.trim());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT t.*, c.title AS campaign_title
      FROM transactions t
      LEFT JOIN campaigns c ON c.id = t.campaign_id
      ${whereClause}
      ORDER BY t.timestamp DESC, t.id DESC
    `;

    const transactions = await (db as any).all(query, params);
    const ids = transactions.map((row: { id: number }) => row.id);
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(', ');
      const allocRows = await (db as any).all(
        `SELECT transaction_id, region, amount, notes FROM transaction_allocations WHERE transaction_id IN (${placeholders}) ORDER BY id ASC`,
        ids
      );
      const allocByTx = new Map<number, Array<{ region: string; amount: number; notes: string | null }>>();
      for (const a of allocRows) {
        const list = allocByTx.get(a.transaction_id) ?? [];
        list.push({ region: a.region, amount: a.amount, notes: a.notes ?? null });
        allocByTx.set(a.transaction_id, list);
      }
      for (const tx of transactions) {
        tx.allocations = allocByTx.get(tx.id) ?? [];
      }
    }
    res.json(transactions);
  } catch (error: any) {
    console.error('[GET TRANSACTIONS ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

/**
 * Registers a distribution record.
 *
 * Ordering matters: the row is persisted and committed first, then the
 * blockchain registration is attempted. A blockchain failure therefore leaves a
 * durable, retryable PENDING_BLOCKCHAIN record instead of losing the report.
 * The audit hash is derived from the committed row id (see utils/crypto.ts),
 * which keeps it unique per record so a legitimate repeat distribution cannot
 * collide with an existing on-chain hash.
 */
export const createTransaction = async (req: Request, res: Response) => {
  const { db } = req;
  const file = req.file as Express.Multer.File | undefined;
  let persisted: ReturnType<typeof persistUpload> = null;

  try {
    const parsed = TransactionSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: formatIssues(parsed.error) });
    }

    const { amount, donor_name, recipient_name, category, region, campaign_id, mustahik_id, allocations } = parsed.data;

    if (allocations && allocations.length > 0) {
      const allocSum = allocations.reduce((sum, item) => sum + item.amount, 0);
      if (Math.abs(allocSum - amount) > 0.01) {
        return res.status(400).json({
          error: 'Validation failed',
          details: [{ path: ['allocations'], message: 'Total alokasi wilayah harus sama dengan nominal penyaluran' }],
        });
      }
    }

    if (campaign_id !== undefined) {
      const campaign = await (db as any).get('SELECT id FROM campaigns WHERE id = ?', [campaign_id]);
      if (!campaign) {
        return res.status(404).json({ error: 'Kampanye tidak ditemukan' });
      }
    }

    if (mustahik_id !== undefined) {
      const mustahik = await (db as any).get('SELECT id FROM mustahik WHERE id = ?', [mustahik_id]);
      if (!mustahik) {
        return res.status(404).json({ error: 'Mustahik tidak ditemukan' });
      }
    }

    let proof_url: string | null = null;
    let file_hash: string | null = null;

    if (file) {
      persisted = persistUpload(file);
      if (!persisted) {
        return res.status(400).json({
          error: 'Format berkas tidak valid. Isi berkas bukan JPG, PNG, atau PDF yang dikenali.',
        });
      }
      file_hash = persisted.sha256;
      proof_url = `/uploads/${persisted.filename}`;
    }

    const summaryRegion = allocations && allocations.length > 1
      ? `Multi-Wilayah (${allocations.length} daerah)`
      : (allocations?.[0]?.region ?? region);

    const transactionData = {
      amount,
      donor_name: donor_name || null,
      recipient_name,
      category,
      region: summaryRegion,
      proof_url,
      file_hash,
    };

    const anomaly_flag = !file ? 1 : 0;
    const anomaly_reason = anomaly_flag ? 'Missing proof of delivery' : null;

    // Insert and hash assignment happen in one transaction so the stored hash
    // always matches the stored row id.
    const { transactionId, audit_hash_hex } = await runInTransaction(db as any, async () => {
      const result = await (db as any).run(
        `INSERT INTO transactions (amount, donor_name, recipient_name, category, region, proof_url, file_hash, audit_hash, anomaly_flag, anomaly_reason, blockchain_status, campaign_id, mustahik_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          amount,
          transactionData.donor_name,
          recipient_name,
          category,
          summaryRegion,
          proof_url,
          file_hash,
          null,
          anomaly_flag,
          anomaly_reason,
          'PENDING_BLOCKCHAIN',
          campaign_id ?? null,
          mustahik_id ?? null,
        ]
      );
      const id = result.lastID as number;
      const hash = generateRecordAuditHash(transactionData, id);
      await (db as any).run('UPDATE transactions SET audit_hash = ? WHERE id = ?', [hash, id]);

      if (allocations && allocations.length > 0) {
        for (const item of allocations) {
          await (db as any).run(
            'INSERT INTO transaction_allocations (transaction_id, region, amount, notes) VALUES (?, ?, ?, ?)',
            [id, item.region, item.amount, item.notes ?? null]
          );
        }
      }
      return { transactionId: id, audit_hash_hex: hash };
    });

    let blockchainStatus = 'PENDING_BLOCKCHAIN';
    let txHash: string | null = null;
    let provider: ReturnType<typeof getBlockchainProvider> | null = null;

    try {
      provider = getBlockchainProvider();
      const wallet = getBlockchainWallet(provider);
      if (!wallet) throw new Error('Blockchain signer is not configured');
      const contract = getZakatContract(provider);
      const walletContract = contract.connect(wallet) as any;

      const formattedHash = ethers.id(audit_hash_hex);
      const tx = await walletContract.registerReport(formattedHash, transactionId);
      txHash = tx.hash;
      await (db as any).run(
        `UPDATE transactions SET tx_hash = ?, blockchain_status = 'PENDING_BLOCKCHAIN' WHERE id = ?`,
        [txHash, transactionId]
      );

      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error('Blockchain transaction was not confirmed');

      blockchainStatus = 'CONFIRMED';
      await (db as any).run(
        `UPDATE transactions SET blockchain_status = ?, tx_hash = ?, block_number = ? WHERE id = ?`,
        [blockchainStatus, txHash, receipt.blockNumber, transactionId]
      );
    } catch (blockchainError: any) {
      // The local record is already committed. Keep the row and any known tx
      // hash so PATCH /:id/reconcile can retry safely and idempotently.
      console.error(`[BLOCKCHAIN CONNECTION ERROR] ${blockchainError?.message}`);
    } finally {
      provider?.destroy();
    }

    res.status(201).json({
      id: transactionId,
      audit_hash: audit_hash_hex,
      tx_hash: txHash,
      blockchain_status: blockchainStatus,
    });

  } catch (error: any) {
    // Only remove the file when the row was never committed.
    if (persisted) removeUpload(persisted.path);
    console.error(`[CRITICAL ERROR] ${error?.stack || error?.message}`);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

export const reconcileTransaction = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { db } = req;

  if (!id || Array.isArray(id) || !/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({ error: 'A valid transaction ID is required' });
  }
  const numericId = Number(id);
  let provider: ReturnType<typeof getBlockchainProvider> | null = null;

  try {
    const transaction = await (db as any).get(
      'SELECT id, amount, donor_name, recipient_name, category, region, proof_url, file_hash, audit_hash, proof_status, blockchain_status, tx_hash FROM transactions WHERE id = ?',
      [numericId]
    );
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (transaction.proof_status === 'REJECTED' || transaction.blockchain_status === 'REVOKED') {
      return res.status(409).json({
        error: 'Transaksi berstatus ditolak atau dicabut tidak dapat dicatat ke blockchain',
      });
    }
    if (!transaction.audit_hash) return res.status(409).json({ error: 'Transaction has no audit hash' });

    if (transaction.blockchain_status === 'CONFIRMED' && transaction.tx_hash) {
      await (db as any).run('UPDATE transactions SET is_reconciled = 1 WHERE id = ?', [numericId]);
      await logActivity(req, 'RECONCILE_TRANSACTION', 'TRANSACTION', numericId, transaction.blockchain_status, 'CONFIRMED');
      return res.json({
        message: 'Transaction is already reconciled',
        tx_hash: transaction.tx_hash,
        blockchain_status: 'CONFIRMED',
      });
    }

    provider = getBlockchainProvider();
    const wallet = getBlockchainWallet(provider);
    if (!wallet) return res.status(503).json({ error: 'Blockchain signer is not configured' });
    const contract = getZakatContract(provider);
    const walletContract = contract.connect(wallet) as any;
    const formattedHash = ethers.id(transaction.audit_hash);

    let reportInfo: [boolean, bigint, boolean];
    try {
      reportInfo = await contract.verifyReport(formattedHash);
    } catch (readError: any) {
      console.error(`[RECONCILIATION READ ERROR] ${readError?.message}`);
      return res.status(502).json({ error: 'Could not reach the blockchain; transaction remains retryable' });
    }

    if (reportInfo[0]) {
      // Already on-chain. Recover the original registration transaction hash
      // from logs, falling back to whatever we already stored.
      let confirmedHash: string | null = transaction.tx_hash || null;
      let blockNumber: number | null = null;

      try {
        const currentBlock = await provider.getBlockNumber();
        // Local nodes commonly prune logs, so scan only a bounded recent window.
        const fromBlock = Math.max(0, currentBlock - 50_000);
        const logs = await contract.queryFilter(
          (contract as any).filters.ReportRegistered(formattedHash),
          fromBlock,
          currentBlock
        );
        const matchingLog = logs.find(
          (log: any) => log.args?.reportId?.toString() === String(transaction.id)
        );
        if (matchingLog) {
          confirmedHash = matchingLog.transactionHash;
          blockNumber = matchingLog.blockNumber;
        }
      } catch (logError: any) {
        console.error(`[RECONCILIATION LOG ERROR] ${logError?.message}`);
      }

      if (!confirmedHash) {
        return res.status(409).json({
          error: 'Report exists on-chain but its transaction hash could not be identified',
        });
      }

      await (db as any).run(
        `UPDATE transactions SET blockchain_status = 'CONFIRMED', is_reconciled = 1, tx_hash = ?, block_number = COALESCE(?, block_number) WHERE id = ?`,
        [confirmedHash, blockNumber, numericId]
      );
      await logActivity(req, 'RECONCILE_TRANSACTION', 'TRANSACTION', numericId, transaction.blockchain_status, 'CONFIRMED');
      return res.json({
        message: 'Transaction already verified on blockchain',
        tx_hash: confirmedHash,
        blockchain_status: 'CONFIRMED',
        blockchain_timestamp: reportInfo[1].toString(),
      });
    }

    // Not on-chain yet: register it now.
    let tx: any;
    try {
      tx = await walletContract.registerReport(formattedHash, numericId);
    } catch (writeError: any) {
      console.error(`[RECONCILIATION WRITE ERROR] ${writeError?.message}`);
      return res.status(502).json({ error: 'Reconciliation failed; transaction remains retryable' });
    }

    await (db as any).run(
      `UPDATE transactions SET tx_hash = ?, blockchain_status = 'PENDING_BLOCKCHAIN' WHERE id = ?`,
      [tx.hash, numericId]
    );

    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      return res.status(502).json({ error: 'Blockchain transaction was not confirmed; transaction remains retryable' });
    }

    await (db as any).run(
      `UPDATE transactions SET tx_hash = ?, blockchain_status = 'CONFIRMED', block_number = ?, is_reconciled = 1 WHERE id = ?`,
      [tx.hash, receipt.blockNumber, numericId]
    );
    await logActivity(req, 'RECONCILE_TRANSACTION', 'TRANSACTION', numericId, transaction.blockchain_status, 'CONFIRMED');

    res.json({
      message: 'Transaction reconciled successfully',
      tx_hash: tx.hash,
      blockchain_status: 'CONFIRMED',
    });

  } catch (error: any) {
    console.error(`[RECONCILIATION ERROR] ${error?.message}`);
    res.status(502).json({ error: 'Reconciliation failed; transaction remains retryable' });
  } finally {
    provider?.destroy();
  }
};

export const revokeTransactionOnChain = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { db } = req;

  if (!id || Array.isArray(id) || !/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({ error: 'A valid transaction ID is required' });
  }
  const parsed = RevokeReportSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: formatIssues(parsed.error) });
  }

  const numericId = Number(id);
  const { reason } = parsed.data;
  let provider: ReturnType<typeof getBlockchainProvider> | null = null;

  try {
    const transaction = await (db as any).get(
      'SELECT id, audit_hash, blockchain_status, proof_status FROM transactions WHERE id = ?',
      [numericId]
    );
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (!transaction.audit_hash) return res.status(409).json({ error: 'Transaction has no audit hash' });
    if (transaction.blockchain_status === 'REVOKED') {
      return res.status(409).json({ error: 'Laporan sudah dicabut di blockchain' });
    }

    provider = getBlockchainProvider();
    const wallet = getBlockchainWallet(provider);
    if (!wallet) return res.status(503).json({ error: 'Blockchain signer is not configured' });

    const contract = getZakatContract(provider);
    const walletContract = contract.connect(wallet) as any;
    const formattedHash = ethers.id(transaction.audit_hash);

    const reportInfo: [boolean, bigint, boolean] = await contract.verifyReport(formattedHash);
    if (!reportInfo[0]) {
      return res.status(409).json({ error: 'Hash laporan belum tercatat di smart contract sehingga tidak dapat dicabut' });
    }
    if (reportInfo[2]) {
      await (db as any).run(
        `UPDATE transactions SET blockchain_status = 'REVOKED', proof_status = 'REJECTED', proof_rejection_reason = ?, revoke_reason = ? WHERE id = ?`,
        [reason, reason, numericId]
      );
      await logActivity(req, 'REVOKE_ON_CHAIN', 'TRANSACTION', numericId, transaction.blockchain_status, 'REVOKED');
      return res.json({ message: 'Status pencabutan disinkronkan dari smart contract', blockchain_status: 'REVOKED' });
    }

    const tx = await walletContract.revokeReport(formattedHash, reason);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      return res.status(502).json({ error: 'Transaksi pencabutan di blockchain gagal dikonfirmasi' });
    }

    await (db as any).run(
      `UPDATE transactions
       SET blockchain_status = 'REVOKED',
           proof_status = 'REJECTED',
           proof_rejection_reason = ?,
           revoke_tx_hash = ?,
           revoke_reason = ?
       WHERE id = ?`,
      [reason, tx.hash, reason, numericId]
    );
    await logActivity(req, 'REVOKE_ON_CHAIN', 'TRANSACTION', numericId, transaction.blockchain_status, 'REVOKED');

    res.json({
      message: 'Laporan berhasil dicabut secara permanen di smart contract',
      revoke_tx_hash: tx.hash,
      blockchain_status: 'REVOKED',
    });
  } catch (error: any) {
    console.error(`[REVOKE ON CHAIN ERROR] ${error?.message}`);
    res.status(502).json({ error: 'Gagal mencabut laporan di blockchain' });
  } finally {
    provider?.destroy();
  }
};
