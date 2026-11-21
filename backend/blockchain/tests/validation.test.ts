import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TransactionSchema,
  CampaignSchema,
  ProofStatusSchema,
  PovertyImportSchema,
  LoginSchema,
  formatIssues,
} from '../utils/validation.js';

test('transaction schema accepts multipart string amounts and trims text', () => {
  const parsed = TransactionSchema.parse({
    amount: '500000',
    donor_name: '  Hamba Allah  ',
    recipient_name: '  Budi Santoso  ',
    category: 'Konsumsi',
    region: '  Jawa Barat, Bandung  ',
  });
  assert.equal(parsed.amount, 500000);
  assert.equal(parsed.donor_name, 'Hamba Allah');
  assert.equal(parsed.recipient_name, 'Budi Santoso');
  assert.equal(parsed.region, 'Jawa Barat, Bandung');
});

test('transaction schema rejects non-numeric, non-positive and non-finite amounts', () => {
  const base = { recipient_name: 'Budi', category: 'Konsumsi', region: 'Jawa Barat' };
  for (const amount of ['abc', '', '0', '-5', 'Infinity', 'NaN', 0, -1, Number.POSITIVE_INFINITY]) {
    const result = TransactionSchema.safeParse({ ...base, amount });
    assert.equal(result.success, false, `amount ${String(amount)} should be rejected`);
  }
});

test('transaction schema rejects unknown categories and short recipient names', () => {
  assert.equal(
    TransactionSchema.safeParse({ amount: 100, recipient_name: 'Budi', category: 'Lainnya', region: 'Jabar' }).success,
    false
  );
  assert.equal(
    TransactionSchema.safeParse({ amount: 100, recipient_name: 'Bu', category: 'Konsumsi', region: 'Jabar' }).success,
    false
  );
});

test('validation issues are formatted with a path array for the frontend', () => {
  const result = TransactionSchema.safeParse({ amount: -1, recipient_name: 'Bu', category: 'Nope', region: 'J' });
  assert.equal(result.success, false);
  if (result.success) return;

  const issues = formatIssues(result.error);
  assert.ok(issues.length > 0);
  for (const issue of issues) {
    assert.ok(Array.isArray(issue.path), 'path must be an array');
    assert.equal(typeof issue.message, 'string');
  }
  const fields = issues.map((issue) => issue.path[0]);
  assert.ok(fields.includes('amount'));
  assert.ok(fields.includes('recipient_name'));
  assert.ok(fields.includes('category'));
});

test('campaign schema rejects invalid target amounts and deadlines', () => {
  assert.equal(CampaignSchema.safeParse({ title: 'X', target_amount: 0 }).success, false);
  assert.equal(CampaignSchema.safeParse({ title: 'X', target_amount: 'abc' }).success, false);
  assert.equal(CampaignSchema.safeParse({ title: '', target_amount: 100 }).success, false);
  assert.equal(CampaignSchema.safeParse({ title: 'X', target_amount: 100, deadline: 'not-a-date' }).success, false);

  const ok = CampaignSchema.safeParse({ title: '  Beasiswa  ', target_amount: '1000', deadline: '2026-06-15' });
  assert.equal(ok.success, true);
  if (ok.success) {
    assert.equal(ok.data.title, 'Beasiswa');
    assert.equal(ok.data.target_amount, 1000);
  }
});

test('campaign schema treats an empty deadline string as absent', () => {
  const parsed = CampaignSchema.safeParse({ title: 'X', target_amount: 100, deadline: '' });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.deadline, undefined);
});

test('proof status schema only accepts APPROVED or REJECTED', () => {
  assert.equal(ProofStatusSchema.safeParse({ status: 'APPROVED' }).success, true);
  assert.equal(ProofStatusSchema.safeParse({ status: 'REJECTED', reason: 'Blur' }).success, true);
  assert.equal(ProofStatusSchema.safeParse({ status: 'PENDING' }).success, false);
  assert.equal(ProofStatusSchema.safeParse({}).success, false);
});

test('poverty import schema rejects malformed rows and out-of-range rates', () => {
  assert.equal(PovertyImportSchema.safeParse({ data: [] }).success, false);
  assert.equal(PovertyImportSchema.safeParse({ data: 'nope' }).success, false);
  assert.equal(
    PovertyImportSchema.safeParse({ data: [{ region_code: '32', region_name: 'Jabar', poverty_rate: 150 }] }).success,
    false
  );
  assert.equal(
    PovertyImportSchema.safeParse({ data: [{ region_code: '32', region_name: 'Jabar', poverty_rate: -1 }] }).success,
    false
  );

  const ok = PovertyImportSchema.safeParse({
    data: [{ region_code: '32', region_name: 'Jawa Barat', poverty_rate: '7.8', poor_population: '3500000' }],
  });
  assert.equal(ok.success, true);
  if (ok.success) {
    assert.equal(ok.data.data[0]?.poverty_rate, 7.8);
    assert.equal(ok.data.data[0]?.poor_population, 3500000);
  }

  const nested = PovertyImportSchema.safeParse({
    data: [
      {
        region_code: '31',
        region_name: 'DKI Jakarta',
        province_code: '31',
        province_name: 'DKI Jakarta',
        level: 'Provinsi',
        poverty_rate: 4.28,
        poverty: {
          poor_population_thousand: 464.87,
          poverty_rate_percent: 4.28,
          poverty_depth_index_p1: 0.574,
          poverty_severity_index_p2: 0.111,
          poverty_line_rp_per_capita_month: 852768.0,
        },
        employment_sector_poor_age15plus_percent: {
          not_working: 46.61,
          agriculture: null,
          non_agriculture: 51.48,
        },
      },
    ],
  });
  assert.equal(nested.success, true);
  if (nested.success) {
    assert.equal(nested.data.data[0]?.poor_population, 464870);
    assert.equal(nested.data.data[0]?.poverty_line, 852768);
    assert.ok(nested.data.data[0]?.indicators_json?.includes('"poverty_depth_index_p1":0.574'));
  }
});

test('login schema rejects missing credentials', () => {
  assert.equal(LoginSchema.safeParse({ username: 'admin' }).success, false);
  assert.equal(LoginSchema.safeParse({ username: '', password: '' }).success, false);
  assert.equal(LoginSchema.safeParse({ username: 'admin', password: 'secret' }).success, true);
});
