import { Request, Response } from 'express';
import { probeNetworkStatus } from '../utils/web3.js';

/**
 * Public, read-only transparency summary.
 * Exposes only aggregate platform metrics and anonymized distribution hashes;
 * beneficiary names, donor names, and uploaded proof URLs are strictly excluded.
 */
export const getPublicTransparency = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const [
      donationRes,
      distributionRes,
      reportCountRes,
      verifiedReportsRes,
      pendingReportsRes,
      activeCampaignsRes,
      categoryDistribution,
      recentTransactions,
      networkStatus,
    ] = await Promise.all([
      (db as any).get(`SELECT COALESCE(SUM(amount), 0) AS total FROM donations WHERE status = 'CONFIRMED'`),
      (db as any).get(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE blockchain_status = 'CONFIRMED' AND proof_status = 'APPROVED'`
      ),
      (db as any).get(`SELECT COUNT(*) AS count FROM transactions`),
      (db as any).get(`SELECT COUNT(*) AS count FROM transactions WHERE blockchain_status = 'CONFIRMED'`),
      (db as any).get(
        `SELECT COUNT(*) AS count FROM transactions WHERE blockchain_status IS NULL OR blockchain_status != 'CONFIRMED'`
      ),
      (db as any).get(`SELECT COUNT(*) AS count FROM campaigns WHERE status = 'ACTIVE'`),
      (db as any).all(
        `SELECT category, SUM(amount) AS total, COUNT(*) AS count FROM transactions GROUP BY category ORDER BY total DESC`
      ),
      (db as any).all(
        `SELECT id, amount, category, region, timestamp, audit_hash, tx_hash, blockchain_status, block_number, proof_status
         FROM transactions
         ORDER BY timestamp DESC, id DESC
         LIMIT 10`
      ),
      probeNetworkStatus(2000),
    ]);

    const totalDonations = Number(donationRes?.total ?? 0);
    const totalDistributed = Number(distributionRes?.total ?? 0);

    res.json({
      kpis: {
        totalDonations,
        totalDistributed,
        balance: totalDonations - totalDistributed,
        totalReports: Number(reportCountRes?.count ?? 0),
        verifiedReports: Number(verifiedReportsRes?.count ?? 0),
        pendingReports: Number(pendingReportsRes?.count ?? 0),
        activeCampaigns: Number(activeCampaignsRes?.count ?? 0),
      },
      categoryDistribution: categoryDistribution ?? [],
      recentTransactions: recentTransactions ?? [],
      networkStatus,
      disclaimer: 'On-chain hanya membuktikan pencatatan hash audit, bukan kebenaran distribusi di dunia nyata.',
    });
  } catch (error: any) {
    console.error('[PUBLIC TRANSPARENCY ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to load public transparency data' });
  }
};

export const getPublicNetwork = async (_req: Request, res: Response) => {
  try {
    const networkStatus = await probeNetworkStatus(2000);
    res.json({ networkStatus });
  } catch (error: any) {
    console.error('[PUBLIC NETWORK ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to probe blockchain network' });
  }
};
