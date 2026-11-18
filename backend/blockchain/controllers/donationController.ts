import { Request, Response } from 'express';

export const getDonations = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const donations = await (db as any).all('SELECT * FROM donations ORDER BY timestamp DESC, id DESC');
    res.json(donations);
  } catch (error: any) {
    console.error('[GET DONATIONS ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
};

export const getDonorHistory = async (req: Request, res: Response) => {
  const { db } = req;
  const { donor_id } = req.params;

  if (!donor_id || Array.isArray(donor_id) || !/^\d+$/.test(donor_id) || Number(donor_id) < 1) {
    return res.status(400).json({ error: 'A valid donor ID is required' });
  }

  try {
    const donations = await (db as any).all(
      'SELECT * FROM donations WHERE donor_id = ? ORDER BY timestamp DESC, id DESC',
      [Number(donor_id)]
    );
    res.json(donations);
  } catch (error: any) {
    console.error('[GET DONOR HISTORY ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch donor history' });
  }
};
