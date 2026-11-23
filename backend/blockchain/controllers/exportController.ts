import { Request, Response } from 'express';

const COLUMNS = [
  'id', 'amount', 'donor_name', 'recipient_name', 'category', 'region',
  'timestamp', 'proof_url', 'file_hash', 'audit_hash', 'is_reconciled',
  'anomaly_flag', 'anomaly_reason', 'tx_hash', 'blockchain_status', 'block_number',
  'proof_status', 'proof_rejection_reason',
] as const;

/**
 * Escapes a value for CSV.
 *
 * Two issues are handled: embedded quotes/newlines (which previously produced
 * malformed CSV) and spreadsheet formula injection — a value beginning with
 * = + - @ is prefixed with a single quote so Excel/Sheets treats it as text.
 */
const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) return '""';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
};

export const exportTransactionsCSV = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const transactions = await (db as any).all('SELECT * FROM transactions ORDER BY id DESC LIMIT 5000');

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'No data to export' });
    }

    const header = COLUMNS.join(',');
    const rows = transactions
      .map((tx: any) => COLUMNS.map((column) => escapeCsvValue(tx[column])).join(','))
      .join('\n');

    // A UTF-8 BOM keeps Indonesian characters readable when opened in Excel.
    const csvContent = `﻿${header}\n${rows}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=zakat_distribution_report.csv');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(csvContent);
  } catch (error: any) {
    console.error('[EXPORT ERROR]', error?.message);
    res.status(500).json({ error: 'Export failed' });
  }
};
