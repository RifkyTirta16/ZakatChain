import { Request, Response } from 'express';
import { parsePagination } from '../utils/validation.js';

export const getAuditLogs = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (typeof req.query.action === 'string' && req.query.action.trim()) {
      conditions.push('a.action = ?');
      params.push(req.query.action.trim());
    }
    if (typeof req.query.entity_type === 'string' && req.query.entity_type.trim()) {
      conditions.push('a.entity_type = ?');
      params.push(req.query.entity_type.trim());
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const logs = await (db as any).all(
      `SELECT a.*, u.username AS actor_username
       FROM audit_logs a
       LEFT JOIN users u ON a.actor_id = u.id
       ${whereClause}
       ORDER BY a.timestamp DESC, a.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    if (req.query.meta === '1') {
      const countRow = await (db as any).get(
        `SELECT COUNT(*) AS total FROM audit_logs a ${whereClause}`,
        params
      );
      return res.json({ items: logs, total: Number(countRow?.total ?? 0), limit, offset });
    }

    res.json(logs);
  } catch (error: any) {
    console.error('[GET AUDIT LOGS ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};
