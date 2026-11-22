
import { z } from 'zod';

/**
 * Shared helpers. Field names and accepted values deliberately match the
 * existing frontend payloads (NewDistributionRecord.tsx, App.tsx) so this
 * stays backward compatible.
 */

const MAX_TEXT = 200;

/** Trims input and rejects empty strings produced by whitespace-only values. */
const trimmedString = (max = MAX_TEXT) =>
  z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { message: 'Wajib diisi' })
    .refine((value) => value.length <= max, { message: `Maksimal ${max} karakter` });

/**
 * Amounts arrive as multipart form strings ("500000") and as JSON numbers.
 * Rejecting non-finite and negative values here prevents NaN reaching SQLite.
 */
const amountValue = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() !== '' ? Number(val) : val),
  z
    .number({ message: 'Nominal harus berupa angka' })
    .finite('Nominal harus berupa angka yang valid')
    .positive('Nominal harus lebih besar dari 0')
    .max(1_000_000_000_000, 'Nominal melebihi batas yang diizinkan')
);

export const CATEGORIES = ['Konsumsi', 'Kesehatan', 'Pendidikan', 'Modal Usaha'] as const;
export const ASNAF_CATEGORIES = [
  'Fakir',
  'Miskin',
  'Amil',
  'Muallaf',
  'Riqab',
  'Gharimin',
  'Fisabilillah',
  'Ibnu Sabil',
] as const;

const optionalPositiveInt = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : typeof val === 'string' ? Number(val) : val),
  z.number({ message: 'ID harus berupa angka' }).int().positive().optional()
);

const allocationItemSchema = z.object({
  region: trimmedString(MAX_TEXT).refine((value) => value.length >= 2, {
    message: 'Wilayah alokasi harus diisi',
  }),
  amount: amountValue,
  notes: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length <= 200, { message: 'Catatan maksimal 200 karakter' })
    .optional(),
});

export const TransactionSchema = z.object({
  amount: amountValue,
  donor_name: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length <= MAX_TEXT, { message: `Maksimal ${MAX_TEXT} karakter` })
    .optional(),
  recipient_name: z
    .string({ message: 'Nama penerima wajib diisi' })
    .transform((value) => value.trim())
    .refine((value) => value.length >= 3, { message: 'Nama penerima minimal 3 karakter' })
    .refine((value) => value.length <= MAX_TEXT, { message: `Maksimal ${MAX_TEXT} karakter` }),
  category: z.enum(CATEGORIES, { message: 'Kategori tidak valid' }),
  region: trimmedString(MAX_TEXT).refine((value) => value.length >= 2, {
    message: 'Wilayah harus diisi',
  }),
  campaign_id: optionalPositiveInt,
  mustahik_id: optionalPositiveInt,
  allocations: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    },
    z.array(allocationItemSchema).min(1).max(20).optional()
  ),
  // Accepted for compatibility, but the server always derives proof_url from the
  // uploaded file; a client-supplied value is never persisted.
  proof_url: z.string().max(500).optional(),
});

export type TransactionInput = z.infer<typeof TransactionSchema>;

export const ProofStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { message: 'Status harus APPROVED atau REJECTED' }),
  reason: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length <= 500, { message: 'Alasan maksimal 500 karakter' })
    .optional(),
});

export const AnomalyResolutionSchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED', 'CLOSED'], { message: 'Status anomali tidak valid' }),
  follow_up: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length <= 500, { message: 'Tindak lanjut maksimal 500 karakter' })
    .optional(),
});

export const CampaignSchema = z.object({
  title: trimmedString(MAX_TEXT),
  description: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length <= 2000, { message: 'Deskripsi maksimal 2000 karakter' })
    .optional(),
  target_amount: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? Number(val) : val),
    z
      .number({ message: 'Target harus berupa angka' })
      .finite('Target harus berupa angka yang valid')
      .positive('Target harus lebih besar dari 0')
  ),
  deadline: z.preprocess(
    (val) => (val === null || val === undefined || (typeof val === 'string' && val.trim() === '') ? undefined : val),
    z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Tanggal tenggat tidak valid' })
      .optional()
  ),
});

export const PaymentIntentSchema = z.object({
  campaign_id: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? Number(val) : val),
    z.number({ message: 'ID kampanye tidak valid' }).int().positive().optional()
  ).optional(),
  amount: amountValue,
  donor_name: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length <= MAX_TEXT, { message: `Maksimal ${MAX_TEXT} karakter` })
    .optional(),
  // `program_id` is accepted for backward compatibility with older clients.
  program_id: z.string().max(120).optional(),
});

const nullableMetric = z.number().finite().nullable().optional();

const indicatorMetricGroup = z.record(z.string(), nullableMetric).optional();

export const PovertyImportSchema = z.object({
  data: z
    .array(
      z
        .object({
          region_code: trimmedString(32),
          region_name: trimmedString(MAX_TEXT),
          province_code: z.string().trim().max(32).optional(),
          province_name: z.string().transform((value) => value.trim()).optional(),
          level: z.string().trim().max(64).optional(),
          poverty_rate: z.preprocess(
            (val) => (typeof val === 'string' && val.trim() !== '' ? Number(val) : val),
            z.number({ message: 'Angka kemiskinan harus berupa angka' }).finite().min(0).max(100)
          ).optional(),
          poor_population: z.coerce.number().int().min(0).optional(),
          poverty_line: z.coerce.number().min(0).optional(),
          reference_year: z.coerce.number().int().min(1900).max(2100).optional(),
          source_name: z.string().max(MAX_TEXT).optional(),
          source_url: z.string().max(500).optional(),
          poverty: z
            .object({
              poor_population_thousand: nullableMetric,
              poverty_rate_percent: z.number().finite().min(0).max(100).optional(),
              poverty_depth_index_p1: nullableMetric,
              poverty_severity_index_p2: nullableMetric,
              poverty_line_rp_per_capita_month: z.number().finite().min(0).optional(),
            })
            .optional(),
          education_poor_age15plus_percent: indicatorMetricGroup,
          school_participation_poor_percent: indicatorMetricGroup,
          employment_status_poor_age15plus_percent: indicatorMetricGroup,
          employment_sector_poor_age15plus_percent: indicatorMetricGroup,
          food_expenditure_share_percent: indicatorMetricGroup,
          housing_poor_households_percent: indicatorMetricGroup,
        })
        .superRefine((row, ctx) => {
          const rate = row.poverty_rate ?? row.poverty?.poverty_rate_percent;
          if (rate === undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['poverty_rate'],
              message: 'Angka kemiskinan harus berupa angka',
            });
          }
        })
        .transform((row) => {
          const povertyRate = row.poverty_rate ?? row.poverty?.poverty_rate_percent ?? 0;
          const poorPopulation =
            row.poor_population !== undefined
              ? row.poor_population
              : row.poverty?.poor_population_thousand != null
                ? Math.round(row.poverty.poor_population_thousand * 1000)
                : undefined;
          const povertyLine =
            row.poverty_line !== undefined
              ? row.poverty_line
              : row.poverty?.poverty_line_rp_per_capita_month;

          const indicatorsPayload = {
            ...(row.poverty?.poverty_depth_index_p1 !== undefined ||
            row.poverty?.poverty_severity_index_p2 !== undefined ||
            row.poverty?.poor_population_thousand !== undefined
              ? {
                  poverty_depth_index_p1: row.poverty?.poverty_depth_index_p1 ?? null,
                  poverty_severity_index_p2: row.poverty?.poverty_severity_index_p2 ?? null,
                  poor_population_thousand: row.poverty?.poor_population_thousand ?? null,
                }
              : {}),
            ...(row.education_poor_age15plus_percent
              ? { education_poor_age15plus_percent: row.education_poor_age15plus_percent }
              : {}),
            ...(row.school_participation_poor_percent
              ? { school_participation_poor_percent: row.school_participation_poor_percent }
              : {}),
            ...(row.employment_status_poor_age15plus_percent
              ? { employment_status_poor_age15plus_percent: row.employment_status_poor_age15plus_percent }
              : {}),
            ...(row.employment_sector_poor_age15plus_percent
              ? { employment_sector_poor_age15plus_percent: row.employment_sector_poor_age15plus_percent }
              : {}),
            ...(row.food_expenditure_share_percent
              ? { food_expenditure_share_percent: row.food_expenditure_share_percent }
              : {}),
            ...(row.housing_poor_households_percent
              ? { housing_poor_households_percent: row.housing_poor_households_percent }
              : {}),
          };

          const indicatorsJson =
            Object.keys(indicatorsPayload).length > 0 ? JSON.stringify(indicatorsPayload) : null;

          return {
            region_code: row.region_code,
            region_name: row.region_name,
            province_name: row.province_name ?? row.region_name,
            level: row.level ?? 'Provinsi',
            poverty_rate: povertyRate,
            poor_population: poorPopulation,
            poverty_line: povertyLine,
            reference_year: row.reference_year,
            source_name: row.source_name,
            source_url: row.source_url,
            indicators_json: indicatorsJson,
          };
        })
    )
    .min(1, 'Minimal satu baris data diperlukan')
    .max(5000, 'Maksimal 5000 baris per impor'),
});

export type NormalizedPovertyRow = z.infer<typeof PovertyImportSchema>['data'][number];

export const RegisterSchema = z.object({
  username: z
    .string({ message: 'Username wajib diisi' })
    .transform((value) => value.trim())
    .refine((value) => value.length >= 3, { message: 'Username minimal 3 karakter' })
    .refine((value) => value.length <= 64, { message: 'Username maksimal 64 karakter' })
    .refine((value) => /^[A-Za-z0-9._-]+$/.test(value), {
      message: 'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung',
    }),
  password: z
    .string({ message: 'Password wajib diisi' })
    .min(10, 'Password minimal 10 karakter')
    .max(128, 'Password maksimal 128 karakter'),
});

export const LoginSchema = z.object({
  username: z.string({ message: 'Username wajib diisi' }).min(1, 'Username wajib diisi').max(64),
  password: z.string({ message: 'Password wajib diisi' }).min(1, 'Password wajib diisi').max(128),
});

export const ReconciliationSchema = z.object({
  period: z.string().max(64).optional(),
});

export const UserRoleUpdateSchema = z.object({
  role: z.enum(['USER', 'AMIL', 'AUDITOR', 'ADMIN'], { message: 'Role harus USER, AMIL, AUDITOR, atau ADMIN' }),
});

export const RevokeReportSchema = z.object({
  reason: trimmedString(500).refine((value) => value.length >= 5, {
    message: 'Alasan pencabutan minimal 5 karakter',
  }),
});

export const MustahikSchema = z.object({
  full_name: trimmedString(MAX_TEXT).refine((value) => value.length >= 3, {
    message: 'Nama lengkap minimal 3 karakter',
  }),
  category_asnaf: z.enum(ASNAF_CATEGORIES, { message: 'Kategori asnaf tidak valid' }),
  region: trimmedString(MAX_TEXT).refine((value) => value.length >= 2, {
    message: 'Wilayah wajib diisi',
  }),
  phone_masked: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length <= 32, { message: 'Kontak maksimal 32 karakter' })
    .optional(),
  verification_status: z.enum(['VERIFIED', 'PENDING', 'INACTIVE']).optional(),
  notes: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length <= 500, { message: 'Catatan maksimal 500 karakter' })
    .optional(),
});

export const MustahikStatusSchema = z.object({
  verification_status: z.enum(['VERIFIED', 'PENDING', 'INACTIVE'], {
    message: 'Status mustahik harus VERIFIED, PENDING, atau INACTIVE',
  }),
  notes: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length <= 500, { message: 'Catatan maksimal 500 karakter' })
    .optional(),
});

/**
 * Formats zod issues into the `{ path, message }` shape the frontend already
 * consumes (NewDistributionRecord.tsx maps `details[].path[].message`).
 *
 * zod v4 exposes `.issues`; `.errors` was removed, so reading `.errors`
 * previously produced `details: undefined` for every validation failure.
 */
export const formatIssues = (error: z.ZodError) =>
  error.issues.map((issue) => ({
    path: issue.path.map(String),
    message: issue.message,
  }));
