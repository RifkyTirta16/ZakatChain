import { Request, Response } from 'express';
import { PovertyImportSchema, formatIssues, type NormalizedPovertyRow } from '../utils/validation.js';
import { runInTransaction, type Database } from '../models/db.js';

interface DistributionRow {
  region: string | null;
  total_reports: number;
  total_distributed: number;
}

interface PovertyRow {
  region_code: string;
  region_name: string;
  province_name: string;
  level?: string | null;
  poverty_rate: number;
  poor_population: number | null;
  poverty_line?: number | null;
  reference_year?: number | null;
  source_name?: string | null;
  source_url?: string | null;
  indicators_json?: string | null;
}

const REGION_ALIASES: Record<string, string> = {
  jakarta: 'dki jakarta',
  'dki jakarta': 'dki jakarta',
  ntt: 'nusa tenggara timur',
  ntb: 'nusa tenggara barat',
  jabar: 'jawa barat',
  jateng: 'jawa tengah',
  jatim: 'jawa timur',
  diy: 'di yogyakarta',
  yogyakarta: 'di yogyakarta',
  sumut: 'sumatera utara',
  sumbar: 'sumatera barat',
  sumsel: 'sumatera selatan',
  kaltim: 'kalimantan timur',
  kalbar: 'kalimantan barat',
  kalteng: 'kalimantan tengah',
  kalsel: 'kalimantan selatan',
  kalut: 'kalimantan utara',
  sulut: 'sulawesi utara',
  sulteng: 'sulawesi tengah',
  sulsel: 'sulawesi selatan',
  sultra: 'sulawesi tenggara',
  sulbar: 'sulawesi barat',
  babel: 'bangka belitung',
  kepri: 'kepulauan riau',
};

const normalizeRegionName = (value: string | null | undefined): string => {
  if (!value) return '';
  const head = value.split(/[,\-–—|]/)[0]?.trim().toLowerCase() ?? '';
  return REGION_ALIASES[head] ?? head;
};

const aggregateRegionDistribution = (
  rows: DistributionRow[],
  regionName: string,
  provinceName: string,
  regionCode: string
): { total_distributed: number; total_reports: number } => {
  const targets = new Set(
    [normalizeRegionName(regionName), normalizeRegionName(provinceName), regionCode.trim().toLowerCase()].filter(Boolean)
  );
  let total_distributed = 0;
  let total_reports = 0;
  for (const row of rows) {
    const raw = (row.region ?? '').trim().toLowerCase();
    const norm = normalizeRegionName(row.region);
    if (targets.has(raw) || targets.has(norm)) {
      total_distributed += Number(row.total_distributed) || 0;
      total_reports += Number(row.total_reports) || 0;
    }
  }
  return { total_distributed, total_reports };
};

const parseIndicators = (raw: string | null | undefined): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const FALLBACK_POVERTY_STATS: PovertyRow[] = [
  { region_code: '31', region_name: 'DKI Jakarta', province_name: 'DKI Jakarta', poverty_rate: 4.28, poor_population: 464870 },
  { region_code: '32', region_name: 'Jawa Barat', province_name: 'Jawa Barat', poverty_rate: 7.02, poor_population: 3654740 },
  { region_code: '33', region_name: 'Jawa Tengah', province_name: 'Jawa Tengah', poverty_rate: 9.48, poor_population: 3366690 },
  { region_code: '35', region_name: 'Jawa Timur', province_name: 'Jawa Timur', poverty_rate: 9.5, poor_population: 3875880 },
  { region_code: '12', region_name: 'Sumatera Utara', province_name: 'Sumatera Utara', poverty_rate: 7.36, poor_population: 1140250 },
  { region_code: '73', region_name: 'Sulawesi Selatan', province_name: 'Sulawesi Selatan', poverty_rate: 7.6, poor_population: 698130 },
  { region_code: '91', region_name: 'Papua', province_name: 'Papua', poverty_rate: 19.16, poor_population: 171380 },
  { region_code: '53', region_name: 'Nusa Tenggara Timur', province_name: 'Nusa Tenggara Timur', poverty_rate: 18.6, poor_population: 1088780 },
];

export const getRegionStats = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const distributionStats = (await (db as any).all(`
      SELECT
        region,
        COUNT(id) as total_reports,
        SUM(amount) as total_distributed
      FROM transactions
      GROUP BY region
    `)) as DistributionRow[];

    const povertyStats = (await (db as any).all('SELECT * FROM poverty_stats ORDER BY region_code ASC')) as PovertyRow[];
    const dataToProcess = povertyStats.length === 0 ? FALLBACK_POVERTY_STATS : povertyStats;

    const finalStats = dataToProcess.map((p) => {
      const dist = aggregateRegionDistribution(distributionStats, p.region_name, p.province_name, p.region_code);

      const targetAmount = (p.poor_population || 100000) * 50000;
      const actualDist = dist.total_distributed || 0;

      const reachPercent = targetAmount > 0 ? actualDist / targetAmount : 0;
      const priorityScore = p.poverty_rate * 0.6 + (1 - Math.min(reachPercent, 1)) * 100 * 0.4;

      return {
        region: p.region_name,
        province: p.province_name,
        region_code: p.region_code,
        level: p.level ?? 'Provinsi',
        poverty_rate: p.poverty_rate,
        poor_population: p.poor_population,
        poverty_line: p.poverty_line ?? null,
        indicators: parseIndicators(p.indicators_json),
        total_distributed: actualDist,
        total_reports: dist.total_reports,
        target_amount: targetAmount,
        gap: Math.max(targetAmount - actualDist, 0),
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

export const upsertPovertyRows = async (db: Database, rows: NormalizedPovertyRow[]): Promise<number> => {
  return runInTransaction(db, async () => {
    const statement = await (db as any).prepare(`
      INSERT OR REPLACE INTO poverty_stats
      (region_code, region_name, province_name, level, poverty_rate, poor_population, poverty_line, reference_year, source_name, source_url, indicators_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    try {
      for (const item of rows) {
        await statement.run(
          item.region_code,
          item.region_name,
          item.province_name,
          item.level ?? 'Provinsi',
          item.poverty_rate,
          item.poor_population ?? null,
          item.poverty_line ?? null,
          item.reference_year ?? null,
          item.source_name ?? null,
          item.source_url ?? null,
          item.indicators_json ?? null
        );
      }
    } finally {
      await statement.finalize();
    }
    return rows.length;
  });
};

export const importPovertyData = async (req: Request, res: Response) => {
  const { db } = req;

  const candidateBody = Array.isArray(req.body) ? { data: req.body } : (req.body ?? {});
  const parsed = PovertyImportSchema.safeParse(candidateBody);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: formatIssues(parsed.error) });
  }

  try {
    // All-or-nothing: a bad row no longer leaves a partially imported dataset.
    const imported = await upsertPovertyRows(db, parsed.data.data);
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
    const povertyStats = (await (db as any).all('SELECT * FROM poverty_stats ORDER BY region_code ASC')) as PovertyRow[];
    const distributionStats = (await (db as any).all(`
      SELECT region, COUNT(id) as total_reports, SUM(amount) as total_distributed
      FROM transactions GROUP BY region
    `)) as DistributionRow[];

    const recommendations = povertyStats
      .map((p) => {
        const dist = aggregateRegionDistribution(distributionStats, p.region_name, p.province_name, p.region_code);

        const normPoverty = Math.min(p.poverty_rate / 30, 1);
        const target = (p.poor_population || 100000) * 50000;
        const reach = target > 0 ? dist.total_distributed / target : 0;
        const normReach = 1 - Math.min(reach, 1);

        const score = normPoverty * 0.7 + normReach * 0.3;

        return {
          region_code: p.region_code,
          region_name: p.region_name,
          score: (score * 100).toFixed(2),
          reason: normPoverty > 0.6 ? 'High Poverty Rate' : 'Low Distribution Reach',
          suggested_allocation: Math.max(target - dist.total_distributed, 0),
        };
      })
      .sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

    res.json(recommendations);
  } catch (error: any) {
    console.error('[RECOMMENDATIONS ERROR]', error?.message);
    res.status(500).json({ error: 'Recommendation engine failed' });
  }
};
