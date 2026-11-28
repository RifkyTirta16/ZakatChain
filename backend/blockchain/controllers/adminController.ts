import { Request, Response } from 'express';
import { getBlockchainTelemetry } from '../utils/web3.js';

export const getAdminOverview = async (req: Request, res: Response) => {
  const { db } = req;

  try {
    const [
      donationSumRow,
      distributedSumRow,
      reportCountsRow,
      anomalyCountsRow,
      userCountsRow,
      activeCampaignsRow,
      campaignBreakdownRows,
      generalPoolRow,
      donationBuckets,
      distributionBuckets,
      pendingProofs,
      openAnomalies,
      pendingBlockchain,
      attentionPayments,
      lockedUsers,
      paymentSummaryRow,
      recentAuditLogs,
      blockchain,
    ] = await Promise.all([
      (db as any).get(`SELECT COALESCE(SUM(amount), 0) AS total FROM donations WHERE status = 'CONFIRMED'`),
      (db as any).get(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE blockchain_status = 'CONFIRMED' AND proof_status = 'APPROVED'`
      ),
      (db as any).get(
        `SELECT
           SUM(CASE WHEN COALESCE(proof_status, 'PENDING') != 'REJECTED' AND COALESCE(blockchain_status, '') != 'REVOKED' THEN 1 ELSE 0 END) AS totalReports,
           SUM(CASE WHEN blockchain_status = 'CONFIRMED' AND proof_status = 'APPROVED' THEN 1 ELSE 0 END) AS verifiedReports,
           SUM(CASE WHEN COALESCE(proof_status, 'PENDING') != 'REJECTED' AND COALESCE(blockchain_status, '') != 'REVOKED' AND COALESCE(blockchain_status, '') != 'CONFIRMED' THEN 1 ELSE 0 END) AS pendingBlockchainCount,
           SUM(CASE WHEN COALESCE(proof_status, 'PENDING') = 'PENDING' AND COALESCE(blockchain_status, '') != 'REVOKED' THEN 1 ELSE 0 END) AS pendingProofCount
         FROM transactions`
      ),
      (db as any).get(
        `SELECT
           SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS openAnomalyCount,
           SUM(CASE WHEN status = 'OPEN' AND UPPER(COALESCE(priority, '')) = 'CRITICAL' THEN 1 ELSE 0 END) AS criticalAnomalyCount
         FROM anomalies`
      ),
      (db as any).get(
        `SELECT
           COUNT(*) AS totalUsers,
           SUM(CASE WHEN locked_until IS NOT NULL AND datetime(locked_until) > datetime('now') THEN 1 ELSE 0 END) AS lockedUserCount
         FROM users`
      ),
      (db as any).get(`SELECT COUNT(*) AS count FROM campaigns WHERE status = 'ACTIVE'`),
      (db as any).all(
        `SELECT c.id AS campaign_id, c.title, c.status, c.target_amount,
                COALESCE((SELECT SUM(d.amount) FROM donations d WHERE d.campaign_id = c.id AND d.status = 'CONFIRMED'), 0) AS collected_amount,
                COALESCE((SELECT COUNT(*) FROM donations d WHERE d.campaign_id = c.id AND d.status = 'CONFIRMED'), 0) AS donor_count,
                COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.campaign_id = c.id AND t.blockchain_status = 'CONFIRMED' AND t.proof_status = 'APPROVED'), 0) AS distributed_amount,
                COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.campaign_id = c.id AND COALESCE(t.proof_status, 'PENDING') != 'REJECTED' AND COALESCE(t.blockchain_status, '') != 'REVOKED' AND COALESCE(t.blockchain_status, '') != 'CONFIRMED'), 0) AS pending_distribution_amount,
                COALESCE((SELECT COUNT(*) FROM transactions t WHERE t.campaign_id = c.id AND COALESCE(t.proof_status, 'PENDING') != 'REJECTED'), 0) AS tx_count
         FROM campaigns c
         ORDER BY c.created_at DESC, c.id DESC`
      ),
      (db as any).get(
        `SELECT
           COALESCE((SELECT SUM(d.amount) FROM donations d WHERE d.campaign_id IS NULL AND d.status = 'CONFIRMED'), 0) AS collected_amount,
           COALESCE((SELECT COUNT(*) FROM donations d WHERE d.campaign_id IS NULL AND d.status = 'CONFIRMED'), 0) AS donor_count,
           COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.campaign_id IS NULL AND t.blockchain_status = 'CONFIRMED' AND t.proof_status = 'APPROVED'), 0) AS distributed_amount,
           COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.campaign_id IS NULL AND COALESCE(t.proof_status, 'PENDING') != 'REJECTED' AND COALESCE(t.blockchain_status, '') != 'REVOKED' AND COALESCE(t.blockchain_status, '') != 'CONFIRMED'), 0) AS pending_distribution_amount,
           COALESCE((SELECT COUNT(*) FROM transactions t WHERE t.campaign_id IS NULL AND COALESCE(t.proof_status, 'PENDING') != 'REJECTED'), 0) AS tx_count`
      ),
      (db as any).all(
        `SELECT strftime('%Y-%m-%d', timestamp) AS bucket, COALESCE(SUM(amount), 0) AS amount
         FROM donations
         WHERE status = 'CONFIRMED'
         GROUP BY bucket
         ORDER BY bucket DESC
         LIMIT 12`
      ),
      (db as any).all(
        `SELECT strftime('%Y-%m-%d', timestamp) AS bucket, COALESCE(SUM(amount), 0) AS amount
         FROM transactions
         WHERE blockchain_status = 'CONFIRMED' AND proof_status = 'APPROVED'
         GROUP BY bucket
         ORDER BY bucket DESC
         LIMIT 12`
      ),
      (db as any).all(
        `SELECT id, recipient_name, amount, category, region, proof_url, proof_status, blockchain_status, timestamp
         FROM transactions
         WHERE COALESCE(proof_status, 'PENDING') = 'PENDING'
           AND COALESCE(blockchain_status, '') != 'REVOKED'
         ORDER BY timestamp ASC, id ASC
         LIMIT 10`
      ),
      (db as any).all(
        `SELECT a.id, a.transaction_id, a.type, a.reason, a.priority, a.detected_at, a.status,
                t.recipient_name, t.amount
         FROM anomalies a
         LEFT JOIN transactions t ON t.id = a.transaction_id
         WHERE a.status = 'OPEN'
         ORDER BY CASE UPPER(COALESCE(a.priority, 'MEDIUM'))
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'HIGH' THEN 2
                    ELSE 3
                  END, a.detected_at DESC, a.id DESC
         LIMIT 10`
      ),
      (db as any).all(
        `SELECT id, recipient_name, amount, category, region, proof_status, blockchain_status, audit_hash, timestamp
         FROM transactions
         WHERE COALESCE(blockchain_status, 'PENDING_BLOCKCHAIN') = 'PENDING_BLOCKCHAIN'
           AND COALESCE(proof_status, 'PENDING') != 'REJECTED'
         ORDER BY timestamp ASC, id ASC
         LIMIT 10`
      ),
      (db as any).all(
        `SELECT id, payment_session_id, donor_name, amount, program_id, status, provider_tx_id, created_at, expires_at
         FROM payments
         WHERE UPPER(status) IN ('PENDING', 'FAILED')
         ORDER BY created_at DESC, id DESC
         LIMIT 10`
      ),
      (db as any).all(
        `SELECT id, username, role, COALESCE(failed_login_attempts, 0) AS failed_login_attempts, locked_until
         FROM users
         WHERE locked_until IS NOT NULL
         ORDER BY locked_until DESC`
      ),
      (db as any).get(
        `SELECT COUNT(*) AS totalCount,
                SUM(CASE WHEN UPPER(status) IN ('CONFIRMED', 'PAID', 'SUCCESS') THEN 1 ELSE 0 END) AS confirmedCount,
                SUM(CASE WHEN UPPER(status) = 'PENDING' THEN 1 ELSE 0 END) AS pendingCount,
                SUM(CASE WHEN UPPER(status) = 'EXPIRED' THEN 1 ELSE 0 END) AS expiredCount,
                SUM(CASE WHEN UPPER(status) = 'FAILED' THEN 1 ELSE 0 END) AS failedCount,
                COALESCE(SUM(CASE WHEN UPPER(status) IN ('CONFIRMED', 'PAID', 'SUCCESS') THEN amount ELSE 0 END), 0) AS confirmedVolume,
                SUM(CASE WHEN COALESCE(provider_tx_id, '') LIKE 'DOKU%' THEN 1 ELSE 0 END) AS dokuCount,
                SUM(CASE WHEN COALESCE(provider_tx_id, '') NOT LIKE 'DOKU%' THEN 1 ELSE 0 END) AS sandboxCount
         FROM payments`
      ),
      (db as any).all(
        `SELECT a.id, a.actor_id, u.username AS actor_username, a.action, a.entity_type,
                a.entity_id, a.old_value, a.new_value, a.timestamp
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.actor_id
         ORDER BY a.timestamp DESC, a.id DESC
         LIMIT 15`
      ),
      getBlockchainTelemetry(db),
    ]);

    const totalDonations = Number(donationSumRow?.total ?? 0);
    const totalDistributed = Number(distributedSumRow?.total ?? 0);

    const bucketMap = new Map<string, { bucket: string; donations_amount: number; distributions_amount: number }>();
    for (const row of donationBuckets) {
      if (!row.bucket) continue;
      bucketMap.set(row.bucket, {
        bucket: row.bucket,
        donations_amount: Number(row.amount ?? 0),
        distributions_amount: 0,
      });
    }
    for (const row of distributionBuckets) {
      if (!row.bucket) continue;
      const existing = bucketMap.get(row.bucket) ?? {
        bucket: row.bucket,
        donations_amount: 0,
        distributions_amount: 0,
      };
      existing.distributions_amount = Number(row.amount ?? 0);
      bucketMap.set(row.bucket, existing);
    }
    const cashflowSeries = Array.from(bucketMap.values())
      .sort((a, b) => a.bucket.localeCompare(b.bucket))
      .slice(-12);

    const programBreakdown = [
      ...campaignBreakdownRows.map((c: any) => {
        const collected = Number(c.collected_amount ?? 0);
        const distributed = Number(c.distributed_amount ?? 0);
        return {
          campaign_id: c.campaign_id,
          title: c.title,
          status: c.status,
          target_amount: Number(c.target_amount ?? 0),
          collected_amount: collected,
          distributed_amount: distributed,
          pending_distribution_amount: Number(c.pending_distribution_amount ?? 0),
          available_balance: collected - distributed,
          donor_count: Number(c.donor_count ?? 0),
          tx_count: Number(c.tx_count ?? 0),
        };
      }),
      {
        campaign_id: null,
        title: 'Zakat Umum (Non-Program)',
        status: 'ACTIVE',
        target_amount: 0,
        collected_amount: Number(generalPoolRow?.collected_amount ?? 0),
        distributed_amount: Number(generalPoolRow?.distributed_amount ?? 0),
        pending_distribution_amount: Number(generalPoolRow?.pending_distribution_amount ?? 0),
        available_balance:
          Number(generalPoolRow?.collected_amount ?? 0) - Number(generalPoolRow?.distributed_amount ?? 0),
        donor_count: Number(generalPoolRow?.donor_count ?? 0),
        tx_count: Number(generalPoolRow?.tx_count ?? 0),
      },
    ];

    const activeLockedUsers = lockedUsers.filter(
      (u: any) => u.locked_until && Date.parse(u.locked_until) > Date.now()
    );

    res.json({
      kpis: {
        totalDonations,
        totalDistributed,
        availableBalance: totalDonations - totalDistributed,
        totalReports: Number(reportCountsRow?.totalReports ?? 0),
        verifiedReports: Number(reportCountsRow?.verifiedReports ?? 0),
        pendingBlockchainCount: Number(reportCountsRow?.pendingBlockchainCount ?? 0),
        pendingProofCount: Number(reportCountsRow?.pendingProofCount ?? 0),
        openAnomalyCount: Number(anomalyCountsRow?.openAnomalyCount ?? 0),
        criticalAnomalyCount: Number(anomalyCountsRow?.criticalAnomalyCount ?? 0),
        lockedUserCount: activeLockedUsers.length,
        totalUsers: Number(userCountsRow?.totalUsers ?? 0),
        activeCampaignsCount: Number(activeCampaignsRow?.count ?? 0),
      },
      programBreakdown,
      cashflowSeries,
      priorityQueue: {
        pendingProofs,
        openAnomalies,
        pendingBlockchain,
        attentionPayments,
        lockedUsers: activeLockedUsers,
      },
      paymentSummary: {
        totalCount: Number(paymentSummaryRow?.totalCount ?? 0),
        confirmedCount: Number(paymentSummaryRow?.confirmedCount ?? 0),
        pendingCount: Number(paymentSummaryRow?.pendingCount ?? 0),
        expiredCount: Number(paymentSummaryRow?.expiredCount ?? 0),
        failedCount: Number(paymentSummaryRow?.failedCount ?? 0),
        confirmedVolume: Number(paymentSummaryRow?.confirmedVolume ?? 0),
        dokuCount: Number(paymentSummaryRow?.dokuCount ?? 0),
        sandboxCount: Number(paymentSummaryRow?.sandboxCount ?? 0),
      },
      recentAuditLogs,
      blockchain,
    });
  } catch (error: any) {
    console.error('[ADMIN OVERVIEW ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to load admin command center overview' });
  }
};

export const getAdminBlockchainTelemetry = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const telemetry = await getBlockchainTelemetry(db);
    res.json(telemetry);
  } catch (error: any) {
    console.error('[ADMIN BLOCKCHAIN TELEMETRY ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to load blockchain telemetry' });
  }
};
