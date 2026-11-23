import { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { parsePagination } from '../utils/validation.js';

export const getDonations = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const donations = await (db as any).all(
      `SELECT d.*, c.title AS campaign_title
       FROM donations d
       LEFT JOIN campaigns c ON c.id = d.campaign_id
       ORDER BY d.timestamp DESC, d.id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    res.json(donations);
  } catch (error: any) {
    console.error('[GET DONATIONS ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
};

export const getDonorHistory = async (req: Request, res: Response) => {
  const { db } = req;
  const { donor_id } = req.params;

  if (!donor_id || Array.isArray(donor_id) || !/^\d+$/.test(donor_id) || Number(donor_id) < 1) {
    return res.status(400).json({ error: 'A valid donor ID is required' });
  }

  try {
    const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const donations = await (db as any).all(
      `SELECT d.*, c.title AS campaign_title
       FROM donations d
       LEFT JOIN campaigns c ON c.id = d.campaign_id
       WHERE d.donor_id = ?
       ORDER BY d.timestamp DESC, d.id DESC
       LIMIT ? OFFSET ?`,
      [Number(donor_id), limit, offset]
    );
    res.json(donations);
  } catch (error: any) {
    console.error('[GET DONOR HISTORY ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch donor history' });
  }
};

export const getDonationTrace = async (req: Request, res: Response) => {
  const { db } = req;
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  if (!/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({ error: 'ID donasi tidak valid' });
  }

  const requester = (req as AuthRequest).user;
  if (!requester) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const donation = await (db as any).get(
      `SELECT d.id, d.campaign_id, d.donor_id, d.amount, d.payment_reference, d.status, d.timestamp,
              c.title AS campaign_title, u.username AS donor_username
       FROM donations d
       LEFT JOIN campaigns c ON c.id = d.campaign_id
       LEFT JOIN users u ON u.id = d.donor_id
       WHERE d.id = ?`,
      [Number(id)]
    );
    if (!donation) {
      return res.status(404).json({ error: 'Donasi tidak ditemukan' });
    }
    const isPrivileged = requester.role === 'ADMIN' || requester.role === 'AUDITOR';
    if (!isPrivileged && donation.donor_id !== requester.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (donation.status !== 'CONFIRMED') {
      return res.json({
        donation: {
          id: donation.id,
          campaign_id: donation.campaign_id,
          campaign_title: donation.campaign_title ?? null,
          donor_username: donation.donor_username ?? null,
          amount: Number(donation.amount) || 0,
          payment_reference: donation.payment_reference,
          status: donation.status,
          timestamp: donation.timestamp,
        },
        pool_scope: donation.campaign_id !== null ? 'CAMPAIGN_POOL' : 'GENERAL_ZAKAT_POOL',
        pool_distributed_total: 0,
        regions: [],
        reports: [],
        disclaimer:
          'Pembayaran donasi ini belum terkonfirmasi sehingga dana belum masuk ke pool penyaluran.',
      });
    }

    const poolCondition = donation.campaign_id !== null ? 't.campaign_id = ?' : 't.campaign_id IS NULL';
    const poolParams = donation.campaign_id !== null ? [donation.campaign_id] : [];

    const txs: Array<{
      id: number;
      amount: number;
      category: string;
      region: string;
      audit_hash: string | null;
      tx_hash: string | null;
      blockchain_status: string | null;
      timestamp: string;
    }> = await (db as any).all(
      `SELECT t.id, t.amount, t.category, t.region, t.audit_hash, t.tx_hash, t.blockchain_status, t.timestamp
       FROM transactions t
       WHERE t.proof_status = 'APPROVED'
         AND COALESCE(t.blockchain_status, '') != 'REVOKED'
         AND ${poolCondition}
       ORDER BY t.timestamp DESC, t.id DESC`,
      poolParams
    );

    const txIds = txs.map((t) => t.id);
    const allocMap = new Map<number, Array<{ region: string; amount: number }>>();
    if (txIds.length > 0) {
      const placeholders = txIds.map(() => '?').join(', ');
      const allocRows: Array<{ transaction_id: number; region: string; amount: number }> = await (db as any).all(
        `SELECT transaction_id, region, amount FROM transaction_allocations WHERE transaction_id IN (${placeholders})`,
        txIds
      );
      for (const row of allocRows) {
        const list = allocMap.get(row.transaction_id) ?? [];
        list.push({ region: row.region, amount: Number(row.amount) || 0 });
        allocMap.set(row.transaction_id, list);
      }
    }

    const regionTotals = new Map<string, { region: string; total_distributed: number; tx_count: number }>();
    for (const tx of txs) {
      const splits = allocMap.get(tx.id);
      const items = splits && splits.length > 0 ? splits : [{ region: tx.region || 'Belum Ditentukan', amount: Number(tx.amount) || 0 }];
      for (const item of items) {
        const prev = regionTotals.get(item.region) ?? { region: item.region, total_distributed: 0, tx_count: 0 };
        prev.total_distributed += Number(item.amount) || 0;
        prev.tx_count += 1;
        regionTotals.set(item.region, prev);
      }
    }

    const poolDistributedTotal = Array.from(regionTotals.values()).reduce((sum, r) => sum + r.total_distributed, 0);
    const donationAmount = Number(donation.amount) || 0;
    const sorted = Array.from(regionTotals.values()).sort((a, b) => b.total_distributed - a.total_distributed);

    let remainingPct = 100;
    let remainingEst = Math.round(donationAmount);
    const regions = sorted.map((item, idx) => {
      const isLast = idx === sorted.length - 1;
      const sharePercent = poolDistributedTotal > 0
        ? isLast
          ? Math.max(0, Number(remainingPct.toFixed(1)))
          : Number(((item.total_distributed / poolDistributedTotal) * 100).toFixed(1))
        : 0;
      const estimatedAllocation = poolDistributedTotal > 0
        ? isLast
          ? Math.max(0, remainingEst)
          : Math.round((donationAmount * item.total_distributed) / poolDistributedTotal)
        : 0;
      remainingPct -= sharePercent;
      remainingEst -= estimatedAllocation;
      return {
        region: item.region,
        total_distributed: item.total_distributed,
        tx_count: item.tx_count,
        share_percent: sharePercent,
        estimated_allocation_idr: estimatedAllocation,
      };
    });

    res.json({
      donation: {
        id: donation.id,
        campaign_id: donation.campaign_id,
        campaign_title: donation.campaign_title ?? null,
        donor_username: donation.donor_username ?? null,
        amount: donationAmount,
        payment_reference: donation.payment_reference,
        status: donation.status,
        timestamp: donation.timestamp,
      },
      pool_scope: donation.campaign_id !== null ? 'CAMPAIGN_POOL' : 'GENERAL_ZAKAT_POOL',
      pool_distributed_total: poolDistributedTotal,
      regions,
      reports: txs.slice(0, 10),
      disclaimer:
        'Alokasi per daerah dihitung proporsional dari penyaluran terverifikasi di program/pool dana yang sama. Blockchain membuktikan hash laporan penyaluran tercatat, bukan pelacakan uang fisik per lembar.',
    });
  } catch (error: any) {
    console.error('[DONATION TRACE ERROR]', error?.message);
    res.status(500).json({ error: 'Gagal memuat jejak alokasi donasi' });
  }
};
