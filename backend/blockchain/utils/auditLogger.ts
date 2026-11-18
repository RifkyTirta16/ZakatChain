import { Request } from 'express';

export const logActivity = async (req: Request, action: string, entityType: string, entityId: number | null, oldVal: any = null, newVal: any = null) => {
  const { db } = req;
  const actorId = (req as any).user?.id || null;
  const ipAddress = req.ip;

  try {
    await (db as any).run(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [actorId, action, entityType, entityId, JSON.stringify(oldVal), JSON.stringify(newVal), ipAddress]
    );
  } catch (error) {
    console.error(`[AUDIT LOG ERROR] Failed to log ${action}:`, error);
  }
};
