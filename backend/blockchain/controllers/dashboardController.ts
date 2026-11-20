import { Request, Response } from 'express';

export const getDashboardStats = async (req: Request, res: Response) => {
  const { db } = req;
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

    const reportCountRes = await (db as any).get('SELECT COUNT(*) as count FROM transactions');
    const totalReports = reportCountRes?.count || 0;

    const verifiedReportsRes = await (db as any).get(
      `SELECT COUNT(*) as count FROM transactions WHERE blockchain_status = 'CONFIRMED'`
    );
    const verifiedReports = verifiedReportsRes?.count || 0;

    const pendingReportsRes = await (db as any).get(
      `SELECT COUNT(*) as count FROM transactions WHERE blockchain_status IS NULL OR blockchain_status != 'CONFIRMED'`
    );
    const pendingReports = pendingReportsRes?.count || 0;

    const anomalyRes = await (db as any).get(
      `SELECT COUNT(*) as count FROM anomalies WHERE status = 'OPEN'`
    );
    const openAnomalies = anomalyRes?.count || 0;

    const recentTxs = await (db as any).all(
      `SELECT id, recipient_name, amount, blockchain_status, proof_status, timestamp
       FROM transactions ORDER BY timestamp DESC, id DESC LIMIT 5`
    );

    const categoryRes = await (db as any).all(
      `SELECT category, SUM(amount) as total FROM transactions GROUP BY category`
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
