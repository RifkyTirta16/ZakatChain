import assert from 'node:assert/strict';
import test from 'node:test';
import { generateAuditHash, generateRecordAuditHash } from '../utils/crypto.js';

const record = {
  amount: 500000,
  donor_name: 'Hamba Allah',
  recipient_name: 'Budi',
  category: 'Konsumsi',
  region: 'Jakarta Selatan',
  proof_url: '/uploads/a.png',
  file_hash: 'abc',
};

test('audit hash is a 64-character hex SHA-256 digest', () => {
  const hash = generateAuditHash(record);
  assert.equal(hash.length, 64);
  assert.match(hash, /^[a-f0-9]{64}$/);
});

test('audit hash is stable regardless of object key order', () => {
  const reordered = {
    region: record.region,
    category: record.category,
    recipient_name: record.recipient_name,
    donor_name: record.donor_name,
    amount: record.amount,
    file_hash: record.file_hash,
    proof_url: record.proof_url,
  };
  assert.equal(generateAuditHash(record), generateAuditHash(reordered));
});

test('record audit hash is unique per row for identical distribution content', () => {
  // Regression: two legitimate identical distributions previously produced the
  // same hash, and registerReport reverts on a duplicate hash, so the second
  // record could never be confirmed on-chain.
  const first = generateRecordAuditHash(record, 1);
  const second = generateRecordAuditHash(record, 2);
  assert.notEqual(first, second);
});

test('record audit hash is deterministic for the same row', () => {
  assert.equal(generateRecordAuditHash(record, 7), generateRecordAuditHash(record, 7));
});

test('record audit hash differs when the record content differs', () => {
  const altered = { ...record, amount: 500001 };
  assert.notEqual(generateRecordAuditHash(record, 1), generateRecordAuditHash(altered, 1));
});
