import { Request, Response } from 'express';
import { PovertyImportSchema, formatIssues, type NormalizedPovertyRow } from '../utils/validation.js';
import { runInTransaction, type Database } from '../models/db.js';
import type { AuthRequest } from '../middleware/auth.js';

interface EffectiveDistributionRow {
  tx_id: number;
  region: string | null;
  amount: number;
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
  rows: EffectiveDistributionRow[],
  regionName: string,
  provinceName: string,
  regionCode: string
): { total_distributed: number; total_reports: number } => {
  const targets = new Set(
    [normalizeRegionName(regionName), normalizeRegionName(provinceName), regionCode.trim().toLowerCase()].filter(Boolean)
  );
  let total_distributed = 0;
  const matchedTxIds = new Set<number>();
  for (const row of rows) {
    const raw = (row.region ?? '').trim().toLowerCase();
    const norm = normalizeRegionName(row.region);
    if (targets.has(raw) || targets.has(norm)) {
      total_distributed += Number(row.amount) || 0;
      matchedTxIds.add(row.tx_id);
    }
  }
  return { total_distributed, total_reports: matchedTxIds.size };
};

const fetchEffectiveDistributions = async (db: Database): Promise<EffectiveDistributionRow[]> => {
  // Attribute multi-region allocations to their target regions and ignore rejected/revoked records.
  return (await (db as any).all(`
    SELECT
      t.id AS tx_id,
      COALESCE(ta.region, t.region) AS region,
      COALESCE(ta.amount, t.amount) AS amount
    FROM transactions t
    LEFT JOIN transaction_allocations ta ON ta.transaction_id = t.id
    WHERE COALESCE(t.proof_status, 'PENDING') != 'REJECTED'
      AND COALESCE(t.blockchain_status, '') != 'REVOKED'
  `)) as EffectiveDistributionRow[];
};

const parseIndicators = (raw: string | null | undefined): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const computeRegionMetrics = (p: PovertyRow, distributionRows: EffectiveDistributionRow[]) => {
  const dist = aggregateRegionDistribution(distributionRows, p.region_name, p.province_name, p.region_code);
  const indicators = parseIndicators(p.indicators_json);
  const rawP1 = indicators?.poverty_depth_index_p1;
  const p1 = typeof rawP1 === 'number' && Number.isFinite(rawP1) ? rawP1 : null;

  const targetAmount = (p.poor_population || 100000) * 50000;
  const actualDist = dist.total_distributed || 0;
  const reachFraction = targetAmount > 0 ? Math.min(actualDist / targetAmount, 1) : 0;

  const normPoverty = Math.min(p.poverty_rate / 30, 1);
  const normDepth = Math.min((p1 ?? p.poverty_rate * 0.16) / 6, 1);
  const unreached = 1 - reachFraction;
  const priorityScore = (normPoverty * 0.55 + normDepth * 0.2 + unreached * 0.25) * 100;
  const status: 'CRITICAL' | 'WARNING' | 'STABLE' =
    priorityScore >= 55 ? 'CRITICAL' : priorityScore >= 40 ? 'WARNING' : 'STABLE';

  return {
    region: p.region_name,
    province: p.province_name,
    region_code: p.region_code,
    level: p.level ?? 'Provinsi',
    poverty_rate: p.poverty_rate,
    poor_population: p.poor_population,
    poverty_line: p.poverty_line ?? null,
    indicators,
    total_distributed: actualDist,
    total_reports: dist.total_reports,
    target_amount: targetAmount,
    gap: Math.max(targetAmount - actualDist, 0),
    reach_percentage: (targetAmount > 0 ? actualDist / targetAmount : 0) * 100,
    priority_score: priorityScore.toFixed(2),
    status,
    _p1: p1,
    _scoreNum: priorityScore,
  };
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
    const distributionStats = await fetchEffectiveDistributions(db);
    const povertyStats = (await (db as any).all('SELECT * FROM poverty_stats ORDER BY region_code ASC')) as PovertyRow[];
    const dataToProcess = povertyStats.length === 0 ? FALLBACK_POVERTY_STATS : povertyStats;

    const finalStats = dataToProcess.map((p) => {
      const { _p1: _, _scoreNum: __, ...publicFields } = computeRegionMetrics(p, distributionStats);
      return publicFields;
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

  const requesterRole = (req as AuthRequest).user?.role ?? 'USER';
  const canViewPii = ['AMIL', 'AUDITOR', 'ADMIN'].includes(requesterRole);

  const normalizedTarget = normalizeRegionName(region);
  const rawTarget = region.trim().toLowerCase();

  try {
    const rows = await (db as any).all(
      `SELECT t.id, t.amount, t.donor_name, t.recipient_name, t.category,
              COALESCE(ta.region, t.region) AS matched_region,
              COALESCE(ta.amount, t.amount) AS allocated_amount,
              t.region, t.timestamp, t.proof_url, t.audit_hash, t.tx_hash,
              t.blockchain_status, t.proof_status
       FROM transactions t
       LEFT JOIN transaction_allocations ta ON ta.transaction_id = t.id
       WHERE COALESCE(t.proof_status, 'PENDING') != 'REJECTED'
         AND COALESCE(t.blockchain_status, '') != 'REVOKED'
       ORDER BY t.timestamp DESC, t.id DESC`
    );

    const matched = rows
      .filter((row: any) => {
        const candidateRaw = String(row.matched_region ?? '').trim().toLowerCase();
        const candidateNorm = normalizeRegionName(row.matched_region);
        return candidateRaw === rawTarget || (normalizedTarget && candidateNorm === normalizedTarget);
      })
      .map((row: any) => {
        const base = {
          id: row.id,
          amount: row.allocated_amount ?? row.amount,
          total_amount: row.amount,
          category: row.category,
          region: row.matched_region ?? row.region,
          timestamp: row.timestamp,
          audit_hash: row.audit_hash,
          tx_hash: row.tx_hash,
          blockchain_status: row.blockchain_status,
          proof_status: row.proof_status,
        };
        if (!canViewPii) return base;
        return {
          ...base,
          donor_name: row.donor_name,
          recipient_name: row.recipient_name,
          proof_url: row.proof_url,
        };
      });

    res.json(matched);
  } catch (error: any) {
    console.error('[REGIONAL DISTRIBUTION ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch regional data' });
  }
};

export const getRecommendations = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const povertyStats = (await (db as any).all('SELECT * FROM poverty_stats ORDER BY region_code ASC')) as PovertyRow[];
    const distributionStats = await fetchEffectiveDistributions(db);

    const recommendations = povertyStats
      .map((p) => {
        const metrics = computeRegionMetrics(p, distributionStats);
        const reason =
          p.poverty_rate >= 15
            ? 'Tingkat Kemiskinan Kritis (>15%)'
            : (metrics._p1 ?? 0) >= 2.5
              ? 'Kedalaman Kemiskinan Tinggi (P1)'
              : 'Cakupan Distribusi Rendah';

        return {
          region_code: metrics.region_code,
          region_name: metrics.region,
          score: metrics.priority_score,
          status: metrics.status,
          reason,
          suggested_allocation: metrics.gap,
        };
      })
      .sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

    res.json(recommendations);
  } catch (error: any) {
    console.error('[RECOMMENDATIONS ERROR]', error?.message);
    res.status(500).json({ error: 'Recommendation engine failed' });
  }
};
