import { Request, Response } from 'express';
import { MustahikSchema, MustahikStatusSchema, formatIssues, parsePagination } from '../utils/validation.js';
import { logActivity } from '../utils/auditLogger.js';
import type { AuthRequest } from '../middleware/auth.js';

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (match) => `\\${match}`);

export const listMustahik = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const { search, region, status } = req.query;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (typeof search === 'string' && search.trim()) {
      const term = `%${escapeLike(search.trim())}%`;
      conditions.push("(m.full_name LIKE ? ESCAPE '\\' OR m.region LIKE ? ESCAPE '\\' OR m.category_asnaf LIKE ? ESCAPE '\\')");
      params.push(term, term, term);
    }
    if (typeof region === 'string' && region.trim()) {
      conditions.push('m.region = ?');
      params.push(region.trim());
    }
    if (typeof status === 'string' && status.trim()) {
      conditions.push('m.verification_status = ?');
      params.push(status.trim());
    }

    const { limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await (db as any).all(
      `SELECT m.id, m.full_name, m.category_asnaf, m.region, m.phone_masked,
              m.verification_status, m.notes, m.created_at,
              COUNT(t.id) AS distribution_count,
              COALESCE(SUM(t.amount), 0) AS total_received
       FROM mustahik m
       LEFT JOIN transactions t
         ON t.mustahik_id = m.id
        AND COALESCE(t.proof_status, 'PENDING') != 'REJECTED'
        AND COALESCE(t.blockchain_status, '') != 'REVOKED'
       ${where}
       GROUP BY m.id
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    if (req.query.meta === '1') {
      const countRow = await (db as any).get(
        `SELECT COUNT(*) AS total FROM mustahik m ${where}`,
        params
      );
      return res.json({ items: rows, total: Number(countRow?.total ?? 0), limit, offset });
    }
    res.json(rows);
  } catch (error: any) {
    console.error('[LIST MUSTAHIK ERROR]', error?.message);
    res.status(500).json({ error: 'Gagal memuat data mustahik' });
  }
};

export const getMustahikDetail = async (req: Request, res: Response) => {
  const { db } = req;
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  if (!/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({ error: 'ID mustahik tidak valid' });
  }
  try {
    const mustahik = await (db as any).get(
      'SELECT id, full_name, category_asnaf, region, phone_masked, verification_status, notes, created_at FROM mustahik WHERE id = ?',
      [Number(id)]
    );
    if (!mustahik) {
      return res.status(404).json({ error: 'Mustahik tidak ditemukan' });
    }
    const distributions = await (db as any).all(
      `SELECT id, amount, category, region, timestamp, proof_status, blockchain_status, audit_hash
       FROM transactions
       WHERE mustahik_id = ?
       ORDER BY timestamp DESC, id DESC`,
      [Number(id)]
    );
    res.json({ mustahik, distributions });
  } catch (error: any) {
    console.error('[MUSTAHIK DETAIL ERROR]', error?.message);
    res.status(500).json({ error: 'Gagal memuat detail mustahik' });
  }
};

export const createMustahik = async (req: Request, res: Response) => {
  const { db } = req;
  const parsed = MustahikSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: formatIssues(parsed.error) });
  }

  const { full_name, category_asnaf, region, phone_masked, verification_status, notes } = parsed.data;
  const actorId = (req as AuthRequest).user?.id ?? null;

  try {
    const result = await (db as any).run(
      `INSERT INTO mustahik (full_name, category_asnaf, region, phone_masked, verification_status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name,
        category_asnaf,
        region,
        phone_masked || null,
        verification_status || 'VERIFIED',
        notes || null,
        actorId,
      ]
    );
    const createdId = result.lastID as number;
    await logActivity(req, 'CREATE_MUSTAHIK', 'MUSTAHIK', createdId, null, `${full_name} (${category_asnaf})`);
    const created = await (db as any).get(
      'SELECT id, full_name, category_asnaf, region, phone_masked, verification_status, notes, created_at FROM mustahik WHERE id = ?',
      [createdId]
    );
    res.status(201).json(created);
  } catch (error: any) {
    console.error('[CREATE MUSTAHIK ERROR]', error?.message);
    res.status(500).json({ error: 'Gagal menyimpan data mustahik' });
  }
};

export const updateMustahikStatus = async (req: Request, res: Response) => {
  const { db } = req;
  const id = typeof req.params.id === 'string' ? req.params.id : '';
  if (!/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({ error: 'ID mustahik tidak valid' });
  }
  const parsed = MustahikStatusSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: formatIssues(parsed.error) });
  }
  const numericId = Number(id);
  const { verification_status, notes } = parsed.data;

  try {
    const existing = await (db as any).get('SELECT id, verification_status FROM mustahik WHERE id = ?', [numericId]);
    if (!existing) {
      return res.status(404).json({ error: 'Mustahik tidak ditemukan' });
    }
    await (db as any).run(
      'UPDATE mustahik SET verification_status = ?, notes = COALESCE(?, notes) WHERE id = ?',
      [verification_status, notes ?? null, numericId]
    );
    await logActivity(req, 'UPDATE_MUSTAHIK_STATUS', 'MUSTAHIK', numericId, existing.verification_status, verification_status);
    res.json({ id: numericId, verification_status });
  } catch (error: any) {
    console.error('[UPDATE MUSTAHIK ERROR]', error?.message);
    res.status(500).json({ error: 'Gagal memperbarui status mustahik' });
  }
};
