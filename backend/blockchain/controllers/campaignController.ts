import { Request, Response } from 'express';
import { CampaignSchema, CampaignUpdateSchema, formatIssues } from '../utils/validation.js';
import { logActivity } from '../utils/auditLogger.js';

export const getCampaigns = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const campaigns = await (db as any).all('SELECT * FROM campaigns ORDER BY created_at DESC, id DESC');
    res.json(campaigns);
  } catch (error: any) {
    console.error('[GET CAMPAIGNS ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
};

export const createCampaign = async (req: Request, res: Response) => {
  const { db } = req;

  const parsed = CampaignSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: formatIssues(parsed.error) });
  }
  const { title, description, target_amount, deadline } = parsed.data;

  try {
    const result = await (db as any).run(
      'INSERT INTO campaigns (title, description, target_amount, deadline) VALUES (?, ?, ?, ?)',
      [title, description ?? '', target_amount, deadline ?? null]
    );
    res.status(201).json({ message: 'Campaign created successfully', id: result.lastID });
  } catch (error: any) {
    console.error('[CREATE CAMPAIGN ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
};

export const getCampaignDetail = async (req: Request, res: Response) => {
  const { db } = req;
  const { id } = req.params;

  if (!id || Array.isArray(id) || !/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({ error: 'A valid campaign ID is required' });
  }

  try {
    const campaign = await (db as any).get('SELECT * FROM campaigns WHERE id = ?', [Number(id)]);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Aggregate in SQL rather than transferring every donation row to sum them.
    const totals = await (db as any).get(
      `SELECT COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN amount END), 0) AS total_confirmed,
              COUNT(*) AS donation_count
       FROM donations WHERE campaign_id = ?`,
      [Number(id)]
    );

    const donations = await (db as any).all(
      'SELECT id, campaign_id, amount, status, timestamp FROM donations WHERE campaign_id = ? ORDER BY timestamp DESC, id DESC',
      [Number(id)]
    );

    res.json({
      ...campaign,
      total_confirmed: totals?.total_confirmed ?? 0,
      donation_count: totals?.donation_count ?? 0,
      donations,
    });
  } catch (error: any) {
    console.error('[CAMPAIGN DETAIL ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch campaign details' });
  }
};

export const updateCampaign = async (req: Request, res: Response) => {
  const { db } = req;
  const { id } = req.params;

  if (!id || Array.isArray(id) || !/^\d+$/.test(id) || Number(id) < 1) {
    return res.status(400).json({ error: 'A valid campaign ID is required' });
  }
  const numericId = Number(id);

  const parsed = CampaignUpdateSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: formatIssues(parsed.error) });
  }

  try {
    const existing = await (db as any).get('SELECT * FROM campaigns WHERE id = ?', [numericId]);
    if (!existing) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const { title, description, target_amount, deadline, status } = parsed.data;
    const fields: string[] = [];
    const values: unknown[] = [];

    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (target_amount !== undefined) { fields.push('target_amount = ?'); values.push(target_amount); }
    if (deadline !== undefined) { fields.push('deadline = ?'); values.push(deadline); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }

    values.push(numericId);
    await (db as any).run(`UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await (db as any).get('SELECT * FROM campaigns WHERE id = ?', [numericId]);
    await logActivity(
      req,
      'UPDATE_CAMPAIGN',
      'CAMPAIGN',
      numericId,
      { status: existing.status, target_amount: existing.target_amount },
      { status: updated.status, target_amount: updated.target_amount }
    );
    res.json(updated);
  } catch (error: any) {
    console.error('[UPDATE CAMPAIGN ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
};
