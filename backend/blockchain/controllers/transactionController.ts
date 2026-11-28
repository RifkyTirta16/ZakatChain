import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { generateRecordAuditHash } from '../utils/crypto.js';
import { RevokeReportSchema, TransactionSchema, formatIssues, parsePagination } from '../utils/validation.js';
import {
  enqueueChainWrite,
  getBlockchainProvider,
  getBlockchainWallet,
  getZakatContract,
  withTimeout,
  type ZakatContract,
} from '../utils/web3.js';
import { persistUpload, removeUpload } from '../middleware/upload.js';
import { runInTransaction } from '../models/db.js';
import { logActivity } from '../utils/auditLogger.js';

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (match) => `\\${match}`);

const CHAIN_READ_TIMEOUT_MS = 8000;
const CHAIN_TX_WAIT_TIMEOUT_MS = 15000;

export const getTransactions = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const { search, category, region, status, campaign_id, proof_status } = req.query;

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
      conditions.push('t.category = ?');
      params.push(category.trim());
    }
    if (typeof region === 'string' && region.trim()) {
      conditions.push('t.region = ?');
      params.push(region.trim());
    }
    if (typeof status === 'string' && status.trim()) {
      conditions.push('t.blockchain_status = ?');
      params.push(status.trim());
    }
    if (typeof proof_status === 'string' && proof_status.trim()) {
      conditions.push('t.proof_status = ?');
      params.push(proof_status.trim());
    }
    if (typeof campaign_id === 'string' && /^\d+$/.test(campaign_id.trim())) {
      conditions.push('t.campaign_id = ?');
      params.push(Number(campaign_id.trim()));
    }

    const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT t.*, c.title AS campaign_title
      FROM transactions t
      LEFT JOIN campaigns c ON c.id = t.campaign_id
      ${whereClause}
      ORDER BY t.timestamp DESC, t.id DESC
      LIMIT ? OFFSET ?
    `;

    const [transactions, countRow] = await Promise.all([
      (db as any).all(query, [...params, limit, offset]),
      req.query.meta === '1'
        ? (db as any).get(`SELECT COUNT(*) AS total FROM transactions t ${whereClause}`, params)
        : Promise.resolve(null),
    ]);

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

    if (req.query.meta === '1') {
      return res.json({
        items: transactions,
        total: Number(countRow?.total ?? 0),
        limit,
        offset,
      });
    }
    res.json(transactions);
  } catch (error: any) {
    console.error('[GET TRANSACTIONS ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

/**
 * Single-call relational payload for the Admin / Auditor Slide-Over Drawer:
 * transaction row + multi-region allocations + linked campaign + mustahik +
 * anomalies + entity audit logs.
 */
export const getTransactionDetail = async (req: Request, res: Response) => {
  const { db } = req;
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  if (!/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({ error: 'A valid transaction ID is required' });
  }
  const numericId = Number(id);

  try {
    const transaction = await (db as any).get('SELECT * FROM transactions WHERE id = ?', [numericId]);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const [allocations, campaign, mustahik, anomalies, auditLogs] = await Promise.all([
      (db as any).all(
        'SELECT id, region, amount, notes FROM transaction_allocations WHERE transaction_id = ? ORDER BY id ASC',
        [numericId]
      ),
      transaction.campaign_id
        ? (db as any).get(
            'SELECT id, title, status, target_amount, current_amount FROM campaigns WHERE id = ?',
            [transaction.campaign_id]
          )
        : Promise.resolve(null),
      transaction.mustahik_id
        ? (db as any).get(
            'SELECT id, full_name, category_asnaf, region, phone_masked, verification_status FROM mustahik WHERE id = ?',
            [transaction.mustahik_id]
          )
        : Promise.resolve(null),
      (db as any).all(
        'SELECT id, type, reason, priority, detected_at, status, follow_up FROM anomalies WHERE transaction_id = ? ORDER BY detected_at DESC, id DESC',
        [numericId]
      ),
      (db as any).all(
        `SELECT a.id, a.actor_id, u.username AS actor_username, a.action, a.entity_type,
                a.entity_id, a.old_value, a.new_value, a.ip_address, a.timestamp
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.actor_id
         WHERE a.entity_type = 'TRANSACTION' AND a.entity_id = ?
         ORDER BY a.timestamp DESC, a.id DESC
         LIMIT 50`,
        [numericId]
      ),
    ]);

    res.json({
      transaction: { ...transaction, allocations },
      allocations,
      campaign: campaign ?? null,
      mustahik: mustahik ?? null,
      anomalies,
      auditLogs,
    });
  } catch (error: any) {
    console.error('[TRANSACTION DETAIL ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to load transaction detail' });
  }
};

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

    try {
      await enqueueChainWrite(async () => {
        const provider = getBlockchainProvider();
        try {
          const wallet = getBlockchainWallet(provider);
          if (!wallet) throw new Error('Blockchain signer is not configured');
          const contract = getZakatContract(provider);
          const walletContract = contract.connect(wallet) as ZakatContract;

          const formattedHash = ethers.id(audit_hash_hex);
          const signerAddress = await wallet.getAddress();
          const nonce = await provider.getTransactionCount(signerAddress, 'pending');
          const tx = await walletContract.registerReport(formattedHash, transactionId, { nonce });
          txHash = tx.hash;
          await (db as any).run(
            `UPDATE transactions SET tx_hash = ?, blockchain_status = 'PENDING_BLOCKCHAIN' WHERE id = ?`,
            [txHash, transactionId]
          );

          const receipt = await withTimeout(tx.wait(), CHAIN_TX_WAIT_TIMEOUT_MS, 'registerReport tx.wait');
          if (!receipt || receipt.status !== 1) {
            throw new Error('Blockchain transaction was not confirmed');
          }

          blockchainStatus = 'CONFIRMED';
          await (db as any).run(
            `UPDATE transactions SET blockchain_status = ?, tx_hash = ?, block_number = ? WHERE id = ?`,
            [blockchainStatus, txHash, receipt.blockNumber, transactionId]
          );
        } finally {
          provider.destroy();
        }
      });
    } catch (blockchainError: any) {
      console.error(`[BLOCKCHAIN CONNECTION ERROR] ${blockchainError?.message}`);
    }

    await logActivity(req, 'CREATE_TRANSACTION', 'TRANSACTION', transactionId, null, blockchainStatus);

    res.status(201).json({
      id: transactionId,
      audit_hash: audit_hash_hex,
      tx_hash: txHash,
      blockchain_status: blockchainStatus,
    });
  } catch (error: any) {
    if (persisted) removeUpload(persisted.path);
    console.error(`[CRITICAL ERROR] ${error?.stack || error?.message}`);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

interface ReconcileOutcome {
  statusCode: number;
  body: Record<string, unknown>;
}

const reconcileSingleTransaction = async (
  db: any,
  req: Request,
  numericId: number
): Promise<ReconcileOutcome> => {
  const transaction = await db.get(
    'SELECT id, audit_hash, proof_status, blockchain_status, tx_hash FROM transactions WHERE id = ?',
    [numericId]
  );
  if (!transaction) return { statusCode: 404, body: { error: 'Transaction not found' } };
  if (transaction.proof_status === 'REJECTED' || transaction.blockchain_status === 'REVOKED') {
    return {
      statusCode: 409,
      body: { error: 'Transaksi berstatus ditolak atau dicabut tidak dapat dicatat ke blockchain' },
    };
  }
  if (!transaction.audit_hash) {
    return { statusCode: 409, body: { error: 'Transaction has no audit hash' } };
  }

  let provider: ReturnType<typeof getBlockchainProvider> | null = null;
  try {
    provider = getBlockchainProvider();
    const wallet = getBlockchainWallet(provider);
    if (!wallet) return { statusCode: 503, body: { error: 'Blockchain signer is not configured' } };
    const contract = getZakatContract(provider);
    const formattedHash = ethers.id(transaction.audit_hash);

    let reportInfo: [boolean, bigint, boolean];
    try {
      reportInfo = await withTimeout(contract.verifyReport(formattedHash), CHAIN_READ_TIMEOUT_MS, 'verifyReport');
    } catch (readError: any) {
      console.error(`[RECONCILIATION READ ERROR] ${readError?.message}`);
      return { statusCode: 502, body: { error: 'Could not reach the blockchain; transaction remains retryable' } };
    }

    if (reportInfo[0]) {
      if (reportInfo[2]) {
        await db.run(
          `UPDATE transactions SET blockchain_status = 'REVOKED', proof_status = 'REJECTED' WHERE id = ?`,
          [numericId]
        );
        await logActivity(req, 'RECONCILE_SYNC_REVOKED', 'TRANSACTION', numericId, transaction.blockchain_status, 'REVOKED');
        return {
          statusCode: 409,
          body: { error: 'Laporan sudah dicabut di smart contract', blockchain_status: 'REVOKED' },
        };
      }

      let confirmedHash: string | null = transaction.tx_hash || null;
      let blockNumber: number | null = null;
      if (!confirmedHash) {
        try {
          const currentBlock = await withTimeout(provider.getBlockNumber(), 4000, 'getBlockNumber');
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
      }

      if (!confirmedHash) {
        return {
          statusCode: 409,
          body: { error: 'Report exists on-chain but its transaction hash could not be identified' },
        };
      }

      await db.run(
        `UPDATE transactions SET blockchain_status = 'CONFIRMED', is_reconciled = 1, tx_hash = ?, block_number = COALESCE(?, block_number) WHERE id = ?`,
        [confirmedHash, blockNumber, numericId]
      );
      await logActivity(req, 'RECONCILE_TRANSACTION', 'TRANSACTION', numericId, transaction.blockchain_status, 'CONFIRMED');
      return {
        statusCode: 200,
        body: {
          message:
            transaction.blockchain_status === 'CONFIRMED'
              ? 'Transaction is already reconciled'
              : 'Transaction already verified on blockchain',
          tx_hash: confirmedHash,
          blockchain_status: 'CONFIRMED',
          blockchain_timestamp: reportInfo[1].toString(),
        },
      };
    }

    // Not on-chain yet (or local node was restarted): serialize write via mutex with pending nonce.
    const txResult = await enqueueChainWrite(async () => {
      const writeProvider = getBlockchainProvider();
      try {
        const writeWallet = getBlockchainWallet(writeProvider);
        if (!writeWallet) throw new Error('Blockchain signer is not configured');
        const writeContract = getZakatContract(writeProvider).connect(writeWallet) as ZakatContract;
        const signerAddress = await writeWallet.getAddress();
        const nonce = await writeProvider.getTransactionCount(signerAddress, 'pending');
        const tx = await writeContract.registerReport(formattedHash, numericId, { nonce });
        await db.run(
          `UPDATE transactions SET tx_hash = ?, blockchain_status = 'PENDING_BLOCKCHAIN' WHERE id = ?`,
          [tx.hash, numericId]
        );
        const receipt = await withTimeout(tx.wait(), CHAIN_TX_WAIT_TIMEOUT_MS, 'reconcile tx.wait');
        if (!receipt || receipt.status !== 1) {
          throw new Error('Blockchain transaction was not confirmed');
        }
        await db.run(
          `UPDATE transactions SET tx_hash = ?, blockchain_status = 'CONFIRMED', block_number = ?, is_reconciled = 1 WHERE id = ?`,
          [tx.hash, receipt.blockNumber, numericId]
        );
        return tx.hash as string;
      } finally {
        writeProvider.destroy();
      }
    });

    await logActivity(req, 'RECONCILE_TRANSACTION', 'TRANSACTION', numericId, transaction.blockchain_status, 'CONFIRMED');
    return {
      statusCode: 200,
      body: {
        message: 'Transaction reconciled successfully',
        tx_hash: txResult,
        blockchain_status: 'CONFIRMED',
      },
    };
  } catch (error: any) {
    console.error(`[RECONCILIATION ERROR] ${error?.message}`);
    return {
      statusCode: 502,
      body: { error: 'Reconciliation failed; transaction remains retryable' },
    };
  } finally {
    provider?.destroy();
  }
};

export const reconcileTransaction = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { db } = req;

  if (!id || Array.isArray(id) || !/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({ error: 'A valid transaction ID is required' });
  }
  const outcome = await reconcileSingleTransaction(db, req, Number(id));
  res.status(outcome.statusCode).json(outcome.body);
};

export const reconcileTransactionsBatch = async (req: Request, res: Response) => {
  const { db } = req;
  const rawIds = req.body?.ids;
  const rawLimit = Number(req.body?.limit);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 20) : 10;

  let targetIds: number[] = [];
  try {
    if (Array.isArray(rawIds)) {
      if (rawIds.length > 20 || !rawIds.every((v) => Number.isSafeInteger(Number(v)) && Number(v) > 0)) {
        return res.status(400).json({ error: 'ids harus berupa daftar maksimal 20 ID transaksi valid' });
      }
      targetIds = Array.from(new Set(rawIds.map((v) => Number(v))));
    } else {
      const pendingRows: Array<{ id: number }> = await (db as any).all(
        `SELECT id FROM transactions
         WHERE COALESCE(proof_status, 'PENDING') != 'REJECTED'
           AND COALESCE(blockchain_status, '') != 'REVOKED'
           AND COALESCE(blockchain_status, '') != 'CONFIRMED'
         ORDER BY id ASC
         LIMIT ?`,
        [limit]
      );
      targetIds = pendingRows.map((r) => r.id);
    }

    const results: Array<{ id: number; ok: boolean; statusCode: number; blockchain_status?: unknown; error?: unknown }> = [];
    let confirmed = 0;
    let failed = 0;

    for (const txId of targetIds) {
      const outcome = await reconcileSingleTransaction(db, req, txId);
      const ok = outcome.statusCode === 200;
      if (ok) confirmed += 1;
      else failed += 1;
      results.push({
        id: txId,
        ok,
        statusCode: outcome.statusCode,
        blockchain_status: outcome.body.blockchain_status,
        error: outcome.body.error,
      });
    }

    await logActivity(req, 'RECONCILE_BATCH', 'TRANSACTION', null, null, `attempted:${targetIds.length},confirmed:${confirmed}`);
    res.json({ attempted: targetIds.length, confirmed, failed, results });
  } catch (error: any) {
    console.error('[BATCH RECONCILE ERROR]', error?.message);
    res.status(500).json({ error: 'Batch reconciliation failed' });
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
    const formattedHash = ethers.id(transaction.audit_hash);

    const reportInfo: [boolean, bigint, boolean] = await withTimeout(
      contract.verifyReport(formattedHash),
      CHAIN_READ_TIMEOUT_MS,
      'revoke verifyReport'
    );
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

    const revokeTxHash = await enqueueChainWrite(async () => {
      const writeProvider = getBlockchainProvider();
      try {
        const writeWallet = getBlockchainWallet(writeProvider);
        if (!writeWallet) throw new Error('Blockchain signer is not configured');
        const walletContract = getZakatContract(writeProvider).connect(writeWallet) as ZakatContract;
        const signerAddress = await writeWallet.getAddress();
        const nonce = await writeProvider.getTransactionCount(signerAddress, 'pending');
        const tx = await walletContract.revokeReport(formattedHash, reason, { nonce });
        const receipt = await withTimeout(tx.wait(), CHAIN_TX_WAIT_TIMEOUT_MS, 'revokeReport tx.wait');
        if (!receipt || receipt.status !== 1) {
          throw new Error('Transaksi pencabutan di blockchain gagal dikonfirmasi');
        }
        return tx.hash as string;
      } finally {
        writeProvider.destroy();
      }
    });

    await (db as any).run(
      `UPDATE transactions
       SET blockchain_status = 'REVOKED',
           proof_status = 'REJECTED',
           proof_rejection_reason = ?,
           revoke_tx_hash = ?,
           revoke_reason = ?
       WHERE id = ?`,
      [reason, revokeTxHash, reason, numericId]
    );
    await logActivity(req, 'REVOKE_ON_CHAIN', 'TRANSACTION', numericId, transaction.blockchain_status, 'REVOKED');

    res.json({
      message: 'Laporan berhasil dicabut secara permanen di smart contract',
      revoke_tx_hash: revokeTxHash,
      blockchain_status: 'REVOKED',
    });
  } catch (error: any) {
    console.error(`[REVOKE ON CHAIN ERROR] ${error?.message}`);
    res.status(502).json({ error: 'Gagal mencabut laporan di blockchain' });
  } finally {
    provider?.destroy();
  }
};
