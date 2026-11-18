import { Request, Response } from 'express';
import { PovertyImportSchema, formatIssues } from '../utils/validation.js';
import { runInTransaction } from '../models/db.js';

const FALLBACK_POVERTY_STATS = [
  { region_code: '11', region_name: 'Jakarta', province_name: 'DKI Jakarta', poverty_rate: 4.5, poor_population: 500000 },
  { region_code: '32', region_name: 'Jawa Barat', province_name: 'Jawa Barat', poverty_rate: 7.8, poor_population: 3500000 },
  { region_code: '33', region_name: 'Jawa Tengah', province_name: 'Jawa Tengah', poverty_rate: 10.2, poor_population: 4000000 },
  { region_code: '35', region_name: 'Jawa Timur', province_name: 'Jawa Timur', poverty_rate: 9.5, poor_population: 4200000 },
  { region_code: '12', region_name: 'Sumatera Utara', province_name: 'Sumatera Utara', poverty_rate: 8.1, poor_population: 2000000 },
  { region_code: '73', region_name: 'Sulawesi Selatan', province_name: 'Sulawesi Selatan', poverty_rate: 6.7, poor_population: 1500000 },
  { region_code: '95', region_name: 'Papua', province_name: 'Papua', poverty_rate: 22.1, poor_population: 1200000 },
  { region_code: '53', region_name: 'NTT', province_name: 'Nusa Tenggara Timur', poverty_rate: 20.5, poor_population: 1800000 },
];

export const getRegionStats = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const distributionStats = await (db as any).all(`
      SELECT
        region,
        COUNT(id) as total_reports,
        SUM(amount) as total_distributed
      FROM transactions
      GROUP BY region
    `);

    const povertyStats = await (db as any).all('SELECT * FROM poverty_stats');
    const dataToProcess = povertyStats.length === 0 ? FALLBACK_POVERTY_STATS : povertyStats;

    const finalStats = dataToProcess.map((p: any) => {
      const dist = distributionStats.find((d: any) => d.region === p.region_name || d.region === p.region_code) || { total_distributed: 0, total_reports: 0 };

      const targetAmount = (p.poor_population || 100000) * 50000;
      const actualDist = dist.total_distributed || 0;

      const reachPercent = targetAmount > 0 ? (actualDist / targetAmount) : 0;
      const priorityScore = (p.poverty_rate * 0.6) + ((1 - Math.min(reachPercent, 1)) * 100 * 0.4);

      return {
        region: p.region_name,
        province: p.province_name,
        region_code: p.region_code,
        poverty_rate: p.poverty_rate,
        poor_population: p.poor_population,
        total_distributed: actualDist,
        total_reports: dist.total_reports,
        target_amount: targetAmount,
        gap: targetAmount - actualDist,
        reach_percentage: reachPercent * 100,
        priority_score: priorityScore.toFixed(2),
        status: priorityScore > 12 ? 'CRITICAL' : priorityScore > 6 ? 'WARNING' : 'STABLE',
      };
    });

    res.json(finalStats);
  } catch (error: any) {
    console.error('[REGION STATS ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch region stats' });
  }
};

export const importPovertyData = async (req: Request, res: Response) => {
  const { db } = req;

  const parsed = PovertyImportSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: formatIssues(parsed.error) });
  }

  try {
    // All-or-nothing: a bad row no longer leaves a partially imported dataset.
    const imported = await runInTransaction(db as any, async () => {
      const statement = await (db as any).prepare(`
        INSERT OR REPLACE INTO poverty_stats
        (region_code, region_name, province_name, poverty_rate, poor_population, poverty_line, reference_year, source_name, source_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      try {
        for (const item of parsed.data.data) {
          await statement.run(
            item.region_code,
            item.region_name,
            item.province_name ?? item.region_name,
            item.poverty_rate,
            item.poor_population ?? null,
            item.poverty_line ?? null,
            item.reference_year ?? null,
            item.source_name ?? null,
            item.source_url ?? null
          );
        }
      } finally {
        await statement.finalize();
      }
      return parsed.data.data.length;
    });

    res.json({ message: `Successfully imported ${imported} records.` });
  } catch (error: any) {
    console.error('[POVERTY IMPORT ERROR]', error?.message);
    res.status(500).json({ error: 'Import failed' });
  }
};

export const getRegionalDistribution = async (req: Request, res: Response) => {
  const { region } = req.params;
  const { db } = req;

  if (!region || Array.isArray(region) || region.length > 200) {
    return res.status(400).json({ error: 'A valid region is required' });
  }

  try {
    const data = await (db as any).all(
      'SELECT * FROM transactions WHERE region = ? ORDER BY timestamp DESC, id DESC',
      [region]
    );
    res.json(data);
  } catch (error: any) {
    console.error('[REGIONAL DISTRIBUTION ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch regional data' });
  }
};

export const getRecommendations = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const povertyStats = await (db as any).all('SELECT * FROM poverty_stats');
    const distributionStats = await (db as any).all(`
      SELECT region, SUM(amount) as total_distributed
      FROM transactions GROUP BY region
    `);

    const recommendations = povertyStats.map((p: any) => {
      const dist = distributionStats.find((d: any) => d.region === p.region_name || d.region === p.region_code) || { total_distributed: 0 };

      const normPoverty = Math.min(p.poverty_rate / 30, 1);
      const target = (p.poor_population || 100000) * 50000;
      const reach = target > 0 ? (dist.total_distributed / target) : 0;
      const normReach = 1 - Math.min(reach, 1);

      const score = (normPoverty * 0.7) + (normReach * 0.3);

      return {
        region_code: p.region_code,
        region_name: p.region_name,
        score: (score * 100).toFixed(2),
        reason: normPoverty > 0.6 ? 'High Poverty Rate' : 'Low Distribution Reach',
        suggested_allocation: target - (dist.total_distributed || 0),
      };
    }).sort((a: { score: string }, b: { score: string }) => parseFloat(b.score) - parseFloat(a.score));

    res.json(recommendations);
  } catch (error: any) {
    console.error('[RECOMMENDATIONS ERROR]', error?.message);
    res.status(500).json({ error: 'Recommendation engine failed' });
  }
};
