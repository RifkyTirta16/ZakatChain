import { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';

export const getDashboardStats = async (req: Request, res: Response) => {
  const { db } = req;
  const requester = (req as AuthRequest).user;
  const isStaff =
    requester?.role === 'ADMIN' || requester?.role === 'AMIL' || requester?.role === 'AUDITOR';

  try {
    const donationRes = await (db as any).get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE status = 'CONFIRMED'`
    );
    const totalDonations = Number(donationRes?.total ?? 0);

    const distributionRes = await (db as any).get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE blockchain_status = 'CONFIRMED' AND proof_status = 'APPROVED'`
    );
    const totalDistributed = Number(distributionRes?.total ?? 0);

    // Exclude REJECTED/REVOKED reports from operational totals & pending queues so KPIs stay truthful.
    const reportCountRes = await (db as any).get(
      `SELECT COUNT(*) as count FROM transactions
       WHERE COALESCE(proof_status, 'PENDING') != 'REJECTED'
         AND COALESCE(blockchain_status, '') != 'REVOKED'`
    );
    const totalReports = reportCountRes?.count || 0;

    const verifiedReportsRes = await (db as any).get(
      `SELECT COUNT(*) as count FROM transactions
       WHERE blockchain_status = 'CONFIRMED'
         AND proof_status = 'APPROVED'`
    );
    const verifiedReports = verifiedReportsRes?.count || 0;

    const pendingReportsRes = await (db as any).get(
      `SELECT COUNT(*) as count FROM transactions
       WHERE COALESCE(proof_status, 'PENDING') != 'REJECTED'
         AND COALESCE(blockchain_status, '') != 'REVOKED'
         AND (blockchain_status IS NULL OR blockchain_status != 'CONFIRMED')`
    );
    const pendingReports = pendingReportsRes?.count || 0;

    const openAnomalies = isStaff
      ? Number(
          (await (db as any).get(`SELECT COUNT(*) as count FROM anomalies WHERE status = 'OPEN'`))?.count ?? 0
        )
      : 0;

    // Never expose beneficiary PII (`recipient_name`) or internal anomaly counts to non-staff roles (`USER`).
    const recentTxs = isStaff
      ? await (db as any).all(
          `SELECT id, recipient_name, category, region, amount, blockchain_status, proof_status, timestamp
           FROM transactions ORDER BY timestamp DESC, id DESC LIMIT 5`
        )
      : await (db as any).all(
          `SELECT id, category, region, amount, blockchain_status, proof_status, timestamp
           FROM transactions
           WHERE COALESCE(proof_status, 'PENDING') != 'REJECTED'
             AND COALESCE(blockchain_status, '') != 'REVOKED'
           ORDER BY timestamp DESC, id DESC LIMIT 5`
        );

    const categoryRes = await (db as any).all(
      `SELECT category, SUM(amount) as total FROM transactions
       WHERE COALESCE(proof_status, 'PENDING') != 'REJECTED'
         AND COALESCE(blockchain_status, '') != 'REVOKED'
       GROUP BY category`
    );

    // Network health is probed rather than hardcoded, so the dashboard does not
    // report "Connected/Healthy" while the RPC endpoint is actually unreachable.
    const { probeNetworkStatus } = await import('../utils/web3.js');
    const networkStatus = await probeNetworkStatus(3000);

    res.json({
      kpis: {
        totalDonations,
        totalDistributed,
        totalReports,
        verifiedReports,
        pendingReports,
        openAnomalies,
        balance: totalDonations - totalDistributed,
      },
      recentTransactions: recentTxs,
      categoryDistribution: categoryRes,
      networkStatus,
    });
  } catch (error: any) {
    console.error('[DASHBOARD ERROR]', error?.message);
    res.status(500).json({ error: 'Dashboard data fetch failed' });
  }
};
