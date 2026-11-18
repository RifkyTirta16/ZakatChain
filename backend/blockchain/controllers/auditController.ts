import { Request, Response } from 'express';

export const getAuditLogs = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const logs = await (db as any).all(`
      SELECT a.*, u.username AS actor_username
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_id = u.id
      ORDER BY a.timestamp DESC, a.id DESC
      LIMIT 500
    `);
    res.json(logs);
  } catch (error: any) {
    console.error('[GET AUDIT LOGS ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};
