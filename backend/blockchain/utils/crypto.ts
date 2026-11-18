
import crypto from 'crypto';

/** Stable key ordering so the same record always produces the same hash. */
const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
};

export const generateAuditHash = (data: any): string => {
  const stringifiedData = JSON.stringify(canonicalize(data));
  return crypto.createHash('sha256').update(stringifiedData).digest('hex');
};

/**
 * Audit hash for a persisted distribution record.
 *
 * Two legitimate distributions to the same recipient, for the same amount, in
 * the same category produce byte-identical content. Hashing content alone made
 * those records collide, and `registerReport` reverts with "Report hash already
 * registered", leaving the second record permanently unconfirmable on-chain.
 *
 * Including the monotonically increasing database id keeps the hash a stable
 * SHA-256 fingerprint of the record while guaranteeing uniqueness per row.
 * Records written before this change keep their content-only hash and continue
 * to verify, because verification reads the stored hash rather than recomputing it.
 */
export const generateRecordAuditHash = (data: any, recordId: number): string =>
  generateAuditHash({ ...canonicalize(data) as Record<string, unknown>, record_id: recordId });
