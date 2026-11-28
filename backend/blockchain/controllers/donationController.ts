import { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { parsePagination } from '../utils/validation.js';

export const getDonations = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const [donations, countRow] = await Promise.all([
      (db as any).all(
        `SELECT d.*, c.title AS campaign_title, u.username AS donor_username
         FROM donations d
         LEFT JOIN campaigns c ON c.id = d.campaign_id
         LEFT JOIN users u ON u.id = d.donor_id
         ORDER BY d.timestamp DESC, d.id DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      ),
      req.query.meta === '1'
        ? (db as any).get('SELECT COUNT(*) AS total FROM donations')
        : Promise.resolve(null),
    ]);
    if (req.query.meta === '1') {
      return res.json({ items: donations, total: Number(countRow?.total ?? 0), limit, offset });
    }
    res.json(donations);
  } catch (error: any) {
    console.error('[GET DONATIONS ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
};

const enrichDonorRow = (row: any, nowMs = Date.now()) => {
  const expiresAt: string | null = row.payment_expires_at ?? null;
  const expiredByTime = Boolean(expiresAt && Date.parse(expiresAt) < nowMs);
  const effectiveStatus =
    row.status === 'PENDING' && (row.payment_status === 'EXPIRED' || expiredByTime)
      ? 'EXPIRED'
      : row.status;
  const isResumable =
    effectiveStatus === 'PENDING' &&
    Boolean(row.payment_reference) &&
    Boolean(expiresAt && Date.parse(expiresAt) > nowMs);
  return {
    ...row,
    status: effectiveStatus,
    payment_expires_at: expiresAt,
    is_resumable: isResumable,
  };
};

const syncExpiredDonorSessions = async (db: any, donorId: number) => {
  const candidates: Array<{ payment_reference: string | null; expires_at: string | null }> = await db.all(
    `SELECT d.payment_reference, p.expires_at
     FROM donations d
     JOIN payments p ON p.payment_session_id = d.payment_reference
     WHERE d.donor_id = ? AND d.status = 'PENDING'`,
    [donorId]
  );
  const now = Date.now();
  const expiredRefs = candidates
    .filter((c) => c.payment_reference && c.expires_at && Date.parse(c.expires_at) < now)
    .map((c) => c.payment_reference as string);
  for (const ref of expiredRefs) {
    await db.run(
      "UPDATE payments SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE payment_session_id = ? AND status = 'PENDING'",
      [ref]
    );
    await db.run(
      "UPDATE donations SET status = 'EXPIRED' WHERE payment_reference = ? AND status = 'PENDING'",
      [ref]
    );
  }
};

export const getDonorHistory = async (req: Request, res: Response) => {
  const { db } = req;
  const { donor_id } = req.params;

  if (!donor_id || Array.isArray(donor_id) || !/^\d+$/.test(donor_id) || Number(donor_id) < 1) {
    return res.status(400).json({ error: 'A valid donor ID is required' });
  }
  const numericDonorId = Number(donor_id);

  try {
    await syncExpiredDonorSessions(db as any, numericDonorId);
    const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const rawRows = await (db as any).all(
      `SELECT d.*, c.title AS campaign_title,
              p.expires_at AS payment_expires_at, p.status AS payment_status
       FROM donations d
       LEFT JOIN campaigns c ON c.id = d.campaign_id
       LEFT JOIN payments p ON p.payment_session_id = d.payment_reference
       WHERE d.donor_id = ?
       ORDER BY d.timestamp DESC, d.id DESC
       LIMIT ? OFFSET ?`,
      [numericDonorId, limit, offset]
    );
    const now = Date.now();
    const donations = rawRows.map((row: any) => enrichDonorRow(row, now));
    if (req.query.meta === '1') {
      const countRow = await (db as any).get('SELECT COUNT(*) AS total FROM donations WHERE donor_id = ?', [
        numericDonorId,
      ]);
      return res.json({ items: donations, total: Number(countRow?.total ?? 0), limit, offset });
    }
    res.json(donations);
  } catch (error: any) {
    console.error('[GET DONOR HISTORY ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch donor history' });
  }
};

export const getMuzakkiOverview = async (req: Request, res: Response) => {
  const { db } = req;
  const requester = (req as AuthRequest).user;
  if (!requester) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    await syncExpiredDonorSessions(db as any, requester.id);
    const now = Date.now();

    const [summaryRow, rawRecentRows, poolRows, activeCampaigns] = await Promise.all([
      (db as any).get(
        `SELECT
           COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN amount ELSE 0 END), 0) AS confirmedTotalAmount,
           SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmedCount,
           SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pendingCount
         FROM donations
         WHERE donor_id = ?`,
        [requester.id]
      ),
      (db as any).all(
        `SELECT d.*, c.title AS campaign_title,
                p.expires_at AS payment_expires_at, p.status AS payment_status
         FROM donations d
         LEFT JOIN campaigns c ON c.id = d.campaign_id
         LEFT JOIN payments p ON p.payment_session_id = d.payment_reference
         WHERE d.donor_id = ?
         ORDER BY d.timestamp DESC, d.id DESC
         LIMIT 20`,
        [requester.id]
      ),
      (db as any).all(
        `SELECT DISTINCT campaign_id FROM donations WHERE donor_id = ? AND status = 'CONFIRMED'`,
        [requester.id]
      ),
      (db as any).all(
        `SELECT c.id, c.title, c.description, c.target_amount, c.current_amount, c.deadline, c.status,
                COALESCE(SUM(CASE WHEN d.status = 'CONFIRMED' THEN d.amount ELSE 0 END), 0) AS collected_amount
         FROM campaigns c
         LEFT JOIN donations d ON d.campaign_id = c.id
         WHERE c.status = 'ACTIVE'
         GROUP BY c.id
         ORDER BY c.created_at DESC, c.id DESC
         LIMIT 3`
      ),
    ]);

    const enrichedRecent = rawRecentRows.map((row: any) => enrichDonorRow(row, now));
    const resumablePayments = enrichedRecent
      .filter((row: any) => row.is_resumable)
      .map((row: any) => ({
        donation_id: row.id,
        session_id: row.payment_reference,
        amount: Number(row.amount) || 0,
        campaign_id: row.campaign_id ?? null,
        campaign_title: row.campaign_title ?? null,
        expires_at: row.payment_expires_at,
      }));

    let impactedRegionsCount = 0;
    if (poolRows.length > 0) {
      const hasGeneral = poolRows.some((p: any) => p.campaign_id === null);
      const campaignIds = poolRows.map((p: any) => p.campaign_id).filter((id: any) => id !== null);
      const clauses: string[] = [];
      const args: number[] = [];
      if (hasGeneral) clauses.push('t.campaign_id IS NULL');
      if (campaignIds.length > 0) {
        clauses.push(`t.campaign_id IN (${campaignIds.map(() => '?').join(', ')})`);
        args.push(...campaignIds);
      }
      if (clauses.length > 0) {
        const regCountRow = await (db as any).get(
          `SELECT COUNT(DISTINCT COALESCE(ta.region, t.region)) AS cnt
           FROM transactions t
           LEFT JOIN transaction_allocations ta ON ta.transaction_id = t.id
           WHERE t.proof_status = 'APPROVED'
             AND COALESCE(t.blockchain_status, '') != 'REVOKED'
             AND (${clauses.join(' OR ')})`,
          args
        );
        impactedRegionsCount = Number(regCountRow?.cnt ?? 0);
      }
    }

    res.json({
      confirmedTotalAmount: Number(summaryRow?.confirmedTotalAmount ?? 0),
      confirmedCount: Number(summaryRow?.confirmedCount ?? 0),
      pendingCount: Number(summaryRow?.pendingCount ?? 0),
      impactedRegionsCount,
      resumablePayments,
      recentDonations: enrichedRecent.slice(0, 5),
      activeCampaigns,
    });
  } catch (error: any) {
    console.error('[MUZAKKI OVERVIEW ERROR]', error?.message);
    res.status(500).json({ error: 'Gagal memuat ringkasan muzakki' });
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
    for (let i = 0; i < txIds.length; i += 200) {
      const chunk = txIds.slice(i, i + 200);
      const placeholders = chunk.map(() => '?').join(', ');
      const allocRows: Array<{ transaction_id: number; region: string; amount: number }> = await (db as any).all(
        `SELECT transaction_id, region, amount FROM transaction_allocations WHERE transaction_id IN (${placeholders})`,
        chunk
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
