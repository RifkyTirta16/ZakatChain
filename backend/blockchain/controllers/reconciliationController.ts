import { Request, Response } from 'express';
import { ReconciliationSchema, formatIssues, parsePagination } from '../utils/validation.js';
import { runInTransaction } from '../models/db.js';
import { logActivity } from '../utils/auditLogger.js';

const buildPeriodFilter = (period: string | undefined): { clause: string; params: string[] } => {
  const clean = period?.trim() || '';
  if (/^\d{4}-\d{2}$/.test(clean)) {
    return { clause: "AND strftime('%Y-%m', timestamp) = ?", params: [clean] };
  }
  if (/^\d{4}$/.test(clean)) {
    return { clause: "AND strftime('%Y', timestamp) = ?", params: [clean] };
  }
  return { clause: '', params: [] };
};

export const performReconciliation = async (req: Request, res: Response) => {
  const { db } = req;
  const parsed = ReconciliationSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: formatIssues(parsed.error) });
  }
  const period = parsed.data.period;
  const periodFilter = buildPeriodFilter(period);

  try {
    const summary = await runInTransaction(db as any, async () => {
      const donationResult = await (db as any).get(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM donations
         WHERE status = 'CONFIRMED' ${periodFilter.clause}`,
        periodFilter.params
      );
      const totalDonations = Number(donationResult?.total ?? 0);

      const distributionResult = await (db as any).get(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM transactions
         WHERE blockchain_status = 'CONFIRMED'
           AND proof_status = 'APPROVED' ${periodFilter.clause}`,
        periodFilter.params
      );
      const totalDistributions = Number(distributionResult?.total ?? 0);

      const balance = totalDonations - totalDistributions;
      const status = balance >= 0 ? 'BALANCED' : 'DEFICIT';

      const insertResult = await (db as any).run(
        `INSERT INTO reconciliation_logs (total_donations, total_distributions, balance, status, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [totalDonations, totalDistributions, balance, status, `Reconciliation for period: ${period || 'General'}`]
      );

      return {
        reconId: insertResult?.lastID ? Number(insertResult.lastID) : null,
        totalDonations,
        totalDistributions,
        balance,
        status,
        period: period || 'Semua Periode',
      };
    });

    await logActivity(
      req,
      'RUN_RECONCILIATION',
      'RECONCILIATION',
      summary.reconId,
      null,
      `${summary.status} (balance: ${summary.balance}, period: ${summary.period})`
    );

    const { reconId: _reconId, ...publicSummary } = summary;
    res.json({
      summary: {
        ...publicSummary,
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
    const { limit, offset } = parsePagination(req.query as Record<string, unknown>, 200, 500);
    const logs = await (db as any).all(
      'SELECT * FROM reconciliation_logs ORDER BY reconciliation_date DESC, id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    if (req.query.meta === '1') {
      const countRow = await (db as any).get('SELECT COUNT(*) AS total FROM reconciliation_logs');
      return res.json({ items: logs, total: Number(countRow?.total ?? 0), limit, offset });
    }
    res.json(logs);
  } catch (error: any) {
    console.error('[RECONCILIATION HISTORY ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch reconciliation history' });
  }
};

export const getThreeWayReconciliation = async (req: Request, res: Response) => {
  const { db } = req;
  const period = typeof req.query.period === 'string' ? req.query.period.trim() : undefined;
  const periodFilter = buildPeriodFilter(period);

  try {
    const donationTimeFilter = periodFilter.clause.replace(/timestamp/g, 'd.timestamp');
    const txTimeFilter = periodFilter.clause.replace(/timestamp/g, 't.timestamp');
    const paymentTimeFilter = periodFilter.clause.replace(/timestamp/g, 'created_at');

    const [
      gatewaySummary,
      mismatchedSessions,
      ledgerTotals,
      campaignRows,
      generalPoolRow,
      onChainSummary,
      exceptionTransactions,
    ] = await Promise.all([
      (db as any).get(
        `SELECT
           COALESCE(SUM(CASE WHEN UPPER(status) IN ('CONFIRMED', 'PAID', 'SUCCESS') THEN amount ELSE 0 END), 0) AS confirmedTotal,
           SUM(CASE WHEN UPPER(status) IN ('CONFIRMED', 'PAID', 'SUCCESS') THEN 1 ELSE 0 END) AS confirmedCount,
           SUM(CASE WHEN UPPER(status) = 'PENDING' THEN 1 ELSE 0 END) AS pendingCount,
           SUM(CASE WHEN UPPER(status) = 'EXPIRED' THEN 1 ELSE 0 END) AS expiredCount,
           SUM(CASE WHEN UPPER(status) = 'FAILED' THEN 1 ELSE 0 END) AS failedCount
         FROM payments
         WHERE 1=1 ${paymentTimeFilter}`,
        periodFilter.params
      ),
      (db as any).all(
        `SELECT p.payment_session_id, p.amount, p.status AS payment_status,
                d.id AS donation_id, d.status AS donation_status, p.created_at
         FROM payments p
         LEFT JOIN donations d ON d.payment_reference = p.payment_session_id
         WHERE (d.id IS NULL OR UPPER(p.status) != UPPER(d.status))
           AND UPPER(p.status) NOT IN ('EXPIRED')
         ORDER BY p.created_at DESC
         LIMIT 50`
      ),
      (db as any).get(
        `SELECT
           (SELECT COALESCE(SUM(amount), 0) FROM donations d WHERE d.status = 'CONFIRMED' ${donationTimeFilter}) AS totalConfirmedDonations,
           (SELECT COALESCE(SUM(amount), 0) FROM transactions t WHERE t.blockchain_status = 'CONFIRMED' AND t.proof_status = 'APPROVED' ${txTimeFilter}) AS totalApprovedConfirmedDistributions,
           (SELECT COALESCE(SUM(amount), 0) FROM transactions t WHERE COALESCE(t.proof_status, 'PENDING') != 'REJECTED' AND COALESCE(t.blockchain_status, '') != 'REVOKED' AND COALESCE(t.blockchain_status, '') != 'CONFIRMED' ${txTimeFilter}) AS pendingDistributionsTotal`,
        [...periodFilter.params, ...periodFilter.params, ...periodFilter.params]
      ),
      (db as any).all(
        `SELECT c.id AS campaign_id, c.title, c.status,
                COALESCE((SELECT SUM(d.amount) FROM donations d WHERE d.campaign_id = c.id AND d.status = 'CONFIRMED' ${donationTimeFilter}), 0) AS donations_confirmed,
                COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.campaign_id = c.id AND t.blockchain_status = 'CONFIRMED' AND t.proof_status = 'APPROVED' ${txTimeFilter}), 0) AS distributions_confirmed,
                COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.campaign_id = c.id AND COALESCE(t.proof_status, 'PENDING') != 'REJECTED' AND COALESCE(t.blockchain_status, '') != 'REVOKED' AND COALESCE(t.blockchain_status, '') != 'CONFIRMED' ${txTimeFilter}), 0) AS pending_distributions,
                COALESCE((SELECT COUNT(*) FROM transactions t WHERE t.campaign_id = c.id AND COALESCE(t.proof_status, 'PENDING') != 'REJECTED' ${txTimeFilter}), 0) AS tx_count
         FROM campaigns c
         ORDER BY c.created_at DESC, c.id DESC`,
        [...periodFilter.params, ...periodFilter.params, ...periodFilter.params, ...periodFilter.params]
      ),
      (db as any).get(
        `SELECT
           COALESCE((SELECT SUM(d.amount) FROM donations d WHERE d.campaign_id IS NULL AND d.status = 'CONFIRMED' ${donationTimeFilter}), 0) AS donations_confirmed,
           COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.campaign_id IS NULL AND t.blockchain_status = 'CONFIRMED' AND t.proof_status = 'APPROVED' ${txTimeFilter}), 0) AS distributions_confirmed,
           COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.campaign_id IS NULL AND COALESCE(t.proof_status, 'PENDING') != 'REJECTED' AND COALESCE(t.blockchain_status, '') != 'REVOKED' AND COALESCE(t.blockchain_status, '') != 'CONFIRMED' ${txTimeFilter}), 0) AS pending_distributions,
           COALESCE((SELECT COUNT(*) FROM transactions t WHERE t.campaign_id IS NULL AND COALESCE(t.proof_status, 'PENDING') != 'REJECTED' ${txTimeFilter}), 0) AS tx_count`,
        [...periodFilter.params, ...periodFilter.params, ...periodFilter.params, ...periodFilter.params]
      ),
      (db as any).get(
        `SELECT
           SUM(CASE WHEN t.blockchain_status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmedOnChainCount,
           SUM(CASE WHEN COALESCE(t.blockchain_status, 'PENDING_BLOCKCHAIN') = 'PENDING_BLOCKCHAIN' AND COALESCE(t.proof_status, 'PENDING') != 'REJECTED' THEN 1 ELSE 0 END) AS pendingBlockchainCount,
           SUM(CASE WHEN t.blockchain_status = 'REVOKED' THEN 1 ELSE 0 END) AS revokedCount,
           SUM(CASE WHEN t.blockchain_status = 'CONFIRMED' AND COALESCE(t.is_reconciled, 0) = 0 THEN 1 ELSE 0 END) AS unreconciledConfirmedCount
         FROM transactions t
         WHERE 1=1 ${txTimeFilter}`,
        periodFilter.params
      ),
      (db as any).all(
        `SELECT t.id, t.amount, t.category, t.region, t.proof_status, t.blockchain_status,
                t.tx_hash, t.timestamp,
                COUNT(a.id) AS open_anomaly_count
         FROM transactions t
         LEFT JOIN anomalies a ON a.transaction_id = t.id AND a.status = 'OPEN'
         WHERE 1=1 ${txTimeFilter}
           AND (
             (COALESCE(t.blockchain_status, 'PENDING_BLOCKCHAIN') = 'PENDING_BLOCKCHAIN' AND COALESCE(t.proof_status, 'PENDING') != 'REJECTED')
             OR (COALESCE(t.proof_status, 'PENDING') = 'PENDING' AND COALESCE(t.blockchain_status, '') != 'REVOKED')
             OR EXISTS (SELECT 1 FROM anomalies ax WHERE ax.transaction_id = t.id AND ax.status = 'OPEN')
           )
         GROUP BY t.id
         ORDER BY open_anomaly_count DESC, t.timestamp DESC, t.id DESC
         LIMIT 50`,
        periodFilter.params
      ),
    ]);

    const totalConfirmedDonations = Number(ledgerTotals?.totalConfirmedDonations ?? 0);
    const totalApprovedConfirmedDistributions = Number(ledgerTotals?.totalApprovedConfirmedDistributions ?? 0);

    const byProgram = [
      ...campaignRows.map((c: any) => {
        const don = Number(c.donations_confirmed ?? 0);
        const dist = Number(c.distributions_confirmed ?? 0);
        return {
          campaign_id: c.campaign_id,
          title: c.title,
          status: c.status,
          donations_confirmed: don,
          distributions_confirmed: dist,
          pending_distributions: Number(c.pending_distributions ?? 0),
          balance: don - dist,
          tx_count: Number(c.tx_count ?? 0),
        };
      }),
      {
        campaign_id: null,
        title: 'Zakat Umum (Non-Program)',
        status: 'ACTIVE',
        donations_confirmed: Number(generalPoolRow?.donations_confirmed ?? 0),
        distributions_confirmed: Number(generalPoolRow?.distributions_confirmed ?? 0),
        pending_distributions: Number(generalPoolRow?.pending_distributions ?? 0),
        balance: Number(generalPoolRow?.donations_confirmed ?? 0) - Number(generalPoolRow?.distributions_confirmed ?? 0),
        tx_count: Number(generalPoolRow?.tx_count ?? 0),
      },
    ];

    res.json({
      period: period || 'ALL',
      gateway: {
        confirmedTotal: Number(gatewaySummary?.confirmedTotal ?? 0),
        confirmedCount: Number(gatewaySummary?.confirmedCount ?? 0),
        pendingCount: Number(gatewaySummary?.pendingCount ?? 0),
        expiredCount: Number(gatewaySummary?.expiredCount ?? 0),
        failedCount: Number(gatewaySummary?.failedCount ?? 0),
        mismatchedSessions,
      },
      ledger: {
        totalConfirmedDonations,
        totalApprovedConfirmedDistributions,
        pendingDistributionsTotal: Number(ledgerTotals?.pendingDistributionsTotal ?? 0),
        availableBalance: totalConfirmedDonations - totalApprovedConfirmedDistributions,
        byProgram,
      },
      onChain: {
        confirmedOnChainCount: Number(onChainSummary?.confirmedOnChainCount ?? 0),
        pendingBlockchainCount: Number(onChainSummary?.pendingBlockchainCount ?? 0),
        revokedCount: Number(onChainSummary?.revokedCount ?? 0),
        unreconciledConfirmedCount: Number(onChainSummary?.unreconciledConfirmedCount ?? 0),
        exceptionTransactions,
      },
    });
  } catch (error: any) {
    console.error('[THREE WAY RECONCILIATION ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to load three-way reconciliation' });
  }
};
