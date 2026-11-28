import { Request, Response } from 'express';
import { probeNetworkStatus } from '../utils/web3.js';
import { parsePagination } from '../utils/validation.js';
import { buildCsvContent } from '../utils/csv.js';

const PUBLIC_DISTRIBUTION_COLUMNS = [
  'id',
  'amount',
  'category',
  'region',
  'timestamp',
  'audit_hash',
  'tx_hash',
  'blockchain_status',
  'block_number',
  'proof_status',
] as const;

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
      approvedProofRes,
      revokedRejectedRes,
      resolvedAnomalyRes,
      openAnomalyRes,
      latestRecon,
      categoryDistribution,
      recentTransactions,
      networkStatus,
    ] = await Promise.all([
      (db as any).get(`SELECT COALESCE(SUM(amount), 0) AS total FROM donations WHERE status = 'CONFIRMED'`),
      (db as any).get(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE blockchain_status = 'CONFIRMED' AND proof_status = 'APPROVED'`
      ),
      (db as any).get(
        `SELECT COUNT(*) AS count FROM transactions
         WHERE COALESCE(proof_status, 'PENDING') != 'REJECTED'
           AND COALESCE(blockchain_status, '') != 'REVOKED'`
      ),
      (db as any).get(
        `SELECT COUNT(*) AS count FROM transactions
         WHERE blockchain_status = 'CONFIRMED'
           AND proof_status = 'APPROVED'`
      ),
      (db as any).get(
        `SELECT COUNT(*) AS count FROM transactions
         WHERE COALESCE(proof_status, 'PENDING') != 'REJECTED'
           AND COALESCE(blockchain_status, '') != 'REVOKED'
           AND (blockchain_status IS NULL OR blockchain_status != 'CONFIRMED')`
      ),
      (db as any).get(`SELECT COUNT(*) AS count FROM campaigns WHERE status = 'ACTIVE'`),
      (db as any).get(
        `SELECT COUNT(*) AS count FROM transactions
         WHERE proof_status = 'APPROVED' AND COALESCE(blockchain_status, '') != 'REVOKED'`
      ),
      (db as any).get(
        `SELECT COUNT(*) AS count FROM transactions
         WHERE proof_status = 'REJECTED' OR COALESCE(blockchain_status, '') = 'REVOKED'`
      ),
      (db as any).get(`SELECT COUNT(*) AS count FROM anomalies WHERE status = 'RESOLVED'`),
      (db as any).get(`SELECT COUNT(*) AS count FROM anomalies WHERE status = 'OPEN'`),
      (db as any).get(
        `SELECT status, reconciliation_date FROM reconciliation_logs ORDER BY reconciliation_date DESC, id DESC LIMIT 1`
      ),
      (db as any).all(
        `SELECT category, SUM(amount) AS total, COUNT(*) AS count FROM transactions
         WHERE COALESCE(proof_status, 'PENDING') != 'REJECTED'
           AND COALESCE(blockchain_status, '') != 'REVOKED'
         GROUP BY category ORDER BY total DESC`
      ),
      (db as any).all(
        `SELECT id, amount, category, region, timestamp, audit_hash, tx_hash, blockchain_status, block_number, proof_status
         FROM transactions
         WHERE COALESCE(proof_status, 'PENDING') != 'REJECTED'
           AND COALESCE(blockchain_status, '') != 'REVOKED'
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
      governancePolicy: {
        amilShareMaxPercent: 12.5,
        netProgramMinPercent: 87.5,
        gatewayFeeNote:
          'Biaya kanal pembayaran mengikuti ketentuan penyedia QRIS resmi tanpa potongan tersembunyi.',
        allocationBasis:
          'Prioritas penyaluran berbasis 8 Asnaf terverifikasi dan indeks kemiskinan wilayah BPS (38 provinsi & 114 kota/kabupaten).',
        shariaReference: 'QS. At-Taubah: 60 & Pedoman Tata Kelola Zakat Nasional',
      },
      integrityScorecard: {
        approvedProofCount: Number(approvedProofRes?.count ?? 0),
        revokedOrRejectedCount: Number(revokedRejectedRes?.count ?? 0),
        resolvedAnomalyCount: Number(resolvedAnomalyRes?.count ?? 0),
        openAnomalyCount: Number(openAnomalyRes?.count ?? 0),
        lastReconciliationStatus: latestRecon?.status ?? 'BALANCED',
        lastReconciliationDate: latestRecon?.reconciliation_date ?? null,
      },
      categoryDistribution: categoryDistribution ?? [],
      recentTransactions: recentTransactions ?? [],
      networkStatus,
      disclaimer:
        'On-chain hanya membuktikan pencatatan hash audit, bukan kebenaran distribusi di dunia nyata.',
    });
  } catch (error: any) {
    console.error('[PUBLIC TRANSPARENCY ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to load public transparency data' });
  }
};

/**
 * Public anonymized distribution feed (paginated JSON or CSV download).
 * Strictly selects non-PII columns only; recipient_name, donor_name, mustahik_id,
 * and uploaded proof URLs are never queried or returned.
 */
export const getPublicDistributions = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const conditions: string[] = ["COALESCE(proof_status, 'PENDING') != 'REJECTED'"];
    const params: (string | number)[] = [];

    if (typeof req.query.category === 'string' && req.query.category.trim()) {
      conditions.push('category = ?');
      params.push(req.query.category.trim());
    }
    if (typeof req.query.region === 'string' && req.query.region.trim()) {
      conditions.push('region = ?');
      params.push(req.query.region.trim());
    }
    if (typeof req.query.status === 'string' && req.query.status.trim()) {
      conditions.push('blockchain_status = ?');
      params.push(req.query.status.trim());
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    if (req.query.format === 'csv') {
      const rows = await (db as any).all(
        `SELECT id, amount, category, region, timestamp, audit_hash, tx_hash, blockchain_status, block_number, proof_status
         FROM transactions
         ${whereClause}
         ORDER BY timestamp DESC, id DESC
         LIMIT 5000`,
        params
      );
      const csvContent = buildCsvContent(PUBLIC_DISTRIBUTION_COLUMNS, rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=zakatchain_publik_penyaluran_anonim.csv'
      );
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(csvContent);
    }

    const { limit, offset } = parsePagination(req.query as Record<string, unknown>, 25, 200);
    const [items, countRow] = await Promise.all([
      (db as any).all(
        `SELECT id, amount, category, region, timestamp, audit_hash, tx_hash, blockchain_status, block_number, proof_status
         FROM transactions
         ${whereClause}
         ORDER BY timestamp DESC, id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      (db as any).get(`SELECT COUNT(*) AS total FROM transactions ${whereClause}`, params),
    ]);

    res.json({
      items,
      total: Number(countRow?.total ?? 0),
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[PUBLIC DISTRIBUTIONS ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to load anonymized distributions' });
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
