import { Request, Response } from 'express';
import { ReconciliationSchema, formatIssues } from '../utils/validation.js';
import { runInTransaction } from '../models/db.js';

export const performReconciliation = async (req: Request, res: Response) => {
  const { db } = req;
  const parsed = ReconciliationSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: formatIssues(parsed.error) });
  }
  const period = parsed.data.period;

  try {
    const summary = await runInTransaction(db as any, async () => {
      // Donations confirmed through the payment webhook.
      const donationResult = await (db as any).get(
        `SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE status = 'CONFIRMED'`
      );
      const totalDonations = Number(donationResult?.total ?? 0);

      // Distributions that are both confirmed on-chain and have an approved proof.
      const distributionResult = await (db as any).get(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
         WHERE blockchain_status = 'CONFIRMED' AND proof_status = 'APPROVED'`
      );
      const totalDistributions = Number(distributionResult?.total ?? 0);

      const balance = totalDonations - totalDistributions;
      const status = balance >= 0 ? 'BALANCED' : 'DEFICIT';

      // Snapshot is written in the same transaction as the aggregation so the
      // stored figures cannot describe a different state than the one returned.
      await (db as any).run(
        `INSERT INTO reconciliation_logs (total_donations, total_distributions, balance, status, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [totalDonations, totalDistributions, balance, status, `Reconciliation for period: ${period || 'General'}`]
      );

      return { totalDonations, totalDistributions, balance, status };
    });

    res.json({
      summary: {
        ...summary,
        timestamp: new Date().toISOString(),
      },
      message: 'Reconciliation completed successfully',
    });
  } catch (error: any) {
    console.error('[RECONCILIATION ERROR]', error?.message);
    res.status(500).json({ error: 'Reconciliation failed' });
  }
};

export const getReconciliationHistory = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const logs = await (db as any).all(
      'SELECT * FROM reconciliation_logs ORDER BY reconciliation_date DESC, id DESC'
    );
    res.json(logs);
  } catch (error: any) {
    console.error('[RECONCILIATION HISTORY ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch reconciliation logs' });
  }
};
