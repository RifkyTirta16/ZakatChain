import { Request, Response } from 'express';
import { logActivity } from '../utils/auditLogger.js';
import { buildCsvContent } from '../utils/csv.js';

const COLUMNS = [
  'id', 'amount', 'donor_name', 'recipient_name', 'category', 'region',
  'timestamp', 'proof_url', 'file_hash', 'audit_hash', 'is_reconciled',
  'anomaly_flag', 'anomaly_reason', 'tx_hash', 'blockchain_status', 'block_number',
  'proof_status', 'proof_rejection_reason',
] as const;

export const exportTransactionsCSV = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const transactions = await (db as any).all('SELECT * FROM transactions ORDER BY id DESC LIMIT 5000');

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'No data to export' });
    }

    const csvContent = buildCsvContent(COLUMNS, transactions);
    await logActivity(req, 'EXPORT_CSV', 'TRANSACTION', null, null, `rows:${transactions.length}`);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=zakat_distribution_report.csv');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(csvContent);
  } catch (error: any) {
    console.error('[EXPORT ERROR]', error?.message);
    res.status(500).json({ error: 'Export failed' });
  }
};
