import { Request, Response } from 'express';
import { logActivity } from '../utils/auditLogger.js';
import { UserRoleUpdateSchema, formatIssues } from '../utils/validation.js';
import type { AuthRequest } from '../middleware/auth.js';

/**
 * Lists user accounts without password hashes. ADMIN only.
 */
export const listUsers = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const users = await (db as any).all(
      'SELECT id, username, role FROM users ORDER BY id ASC'
    );
    res.json(users);
  } catch (error: any) {
    console.error('[LIST USERS ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to load users' });
  }
};

/**
 * Updates a user's role. Prevents an admin from altering their own role to
 * avoid accidental lockouts, and records every change to audit_logs.
 */
export const updateUserRole = async (req: Request, res: Response) => {
  const { db } = req;
  const { id } = req.params;
  const actor = (req as AuthRequest).user;

  if (!id || Array.isArray(id) || !/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({ error: 'A valid user ID is required' });
  }
  const numericId = Number(id);

  const parsed = UserRoleUpdateSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: formatIssues(parsed.error) });
  }
  const nextRole = parsed.data.role;

  if (actor && actor.id === numericId) {
    return res.status(409).json({ error: 'Tidak dapat mengubah peran akun Anda sendiri' });
  }

  try {
    const target = await (db as any).get(
      'SELECT id, username, role FROM users WHERE id = ?',
      [numericId]
    );
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (target.role === nextRole) {
      return res.json({ message: 'Role unchanged', user: target });
    }

    await (db as any).run('UPDATE users SET role = ? WHERE id = ?', [nextRole, numericId]);
    await logActivity(req, 'UPDATE_USER_ROLE', 'USER', numericId, target.role, nextRole);

    res.json({
      message: 'User role updated',
      user: { id: target.id, username: target.username, role: nextRole },
    });
  } catch (error: any) {
    console.error('[UPDATE USER ROLE ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};
