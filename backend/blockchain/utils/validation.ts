
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
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
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

export const PovertyImportSchema = z.object({
  data: z
    .array(
      z.object({
        region_code: trimmedString(32),
        region_name: trimmedString(MAX_TEXT),
        province_name: z.string().transform((value) => value.trim()).optional(),
        poverty_rate: z.preprocess(
          (val) => (typeof val === 'string' && val.trim() !== '' ? Number(val) : val),
          z.number({ message: 'Angka kemiskinan harus berupa angka' }).finite().min(0).max(100)
        ),
        poor_population: z.coerce.number().int().min(0).optional(),
        poverty_line: z.coerce.number().min(0).optional(),
        reference_year: z.coerce.number().int().min(1900).max(2100).optional(),
        source_name: z.string().max(MAX_TEXT).optional(),
        source_url: z.string().max(500).optional(),
      })
    )
    .min(1, 'Minimal satu baris data diperlukan')
    .max(5000, 'Maksimal 5000 baris per impor'),
});

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
