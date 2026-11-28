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
      `SELECT id, username, role,
              COALESCE(failed_login_attempts, 0) AS failed_login_attempts,
              locked_until
       FROM users
       ORDER BY id ASC`
    );
    const enriched = users.map((row: any) => ({
      id: row.id,
      username: row.username,
      role: row.role,
      failed_login_attempts: Number(row.failed_login_attempts ?? 0),
      locked_until: row.locked_until ?? null,
      is_locked: Boolean(row.locked_until && Date.parse(row.locked_until) > Date.now()),
    }));
    res.json(enriched);
  } catch (error: any) {
    console.error('[LIST USERS ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to load users' });
  }
};

export const unlockUser = async (req: Request, res: Response) => {
  const { db } = req;
  const { id } = req.params;

  if (!id || Array.isArray(id) || !/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({ error: 'A valid user ID is required' });
  }
  const numericId = Number(id);

  try {
    const target = await (db as any).get(
      'SELECT id, username, role, locked_until FROM users WHERE id = ?',
      [numericId]
    );
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    await (db as any).run(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
      [numericId]
    );
    await logActivity(req, 'UNLOCK_USER', 'USER', numericId, target.locked_until ?? 'UNLOCKED', 'UNLOCKED');

    res.json({
      message: 'Akun berhasil dibuka kembali',
      user: {
        id: target.id,
        username: target.username,
        role: target.role,
        failed_login_attempts: 0,
        locked_until: null,
        is_locked: false,
      },
    });
  } catch (error: any) {
    console.error('[UNLOCK USER ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to unlock user' });
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

    await (db as any).run(
      'UPDATE users SET role = ?, token_version = COALESCE(token_version, 1) + 1 WHERE id = ?',
      [nextRole, numericId]
    );
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
