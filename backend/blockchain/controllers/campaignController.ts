import { Request, Response } from 'express';
import { CampaignSchema, formatIssues } from '../utils/validation.js';

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
      'SELECT * FROM donations WHERE campaign_id = ? ORDER BY timestamp DESC, id DESC',
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
