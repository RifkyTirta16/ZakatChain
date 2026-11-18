import { Request, Response } from 'express';
import { logActivity } from '../utils/auditLogger.js';
import { ProofStatusSchema, formatIssues } from '../utils/validation.js';

export const updateProofStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { db } = req;

  if (!id || Array.isArray(id) || !/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({ error: 'A valid transaction ID is required' });
  }
  const numericId = Number(id);

  const parsed = ProofStatusSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: formatIssues(parsed.error) });
  }
  const { status, reason } = parsed.data;

  // A rejection without a reason is not actionable for the submitting officer.
  if (status === 'REJECTED' && !reason) {
    return res.status(400).json({ error: 'A reason is required when rejecting a proof' });
  }

  try {
    const oldRecord = await (db as any).get('SELECT proof_status FROM transactions WHERE id = ?', [numericId]);

    const result = await (db as any).run(
      `UPDATE transactions SET proof_status = ?, proof_rejection_reason = ? WHERE id = ?`,
      [status, status === 'REJECTED' ? reason ?? null : null, numericId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await logActivity(req, 'UPDATE_PROOF_STATUS', 'TRANSACTION', numericId, oldRecord?.proof_status, status);

    res.json({ message: `Proof status updated to ${status}` });
  } catch (error: any) {
    console.error('[PROOF STATUS ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to update proof status' });
  }
};
