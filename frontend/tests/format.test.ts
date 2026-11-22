import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractProvince,
  formatIDR,
  formatNumber,
  formatPercent,
  matchesProvinceField,
  provinceMatches,
  shortHash,
} from '../src/utils/format';

test('formatters handle valid numbers, nullish values, and NaN gracefully', () => {
  assert.equal(formatIDR(null), 'Rp 0');
  assert.equal(formatIDR(undefined), 'Rp 0');
  assert.equal(formatIDR(Number.NaN), 'Rp 0');
  assert.equal(formatIDR(1500000), 'Rp 1.500.000');
  assert.equal(formatNumber(12345), '12.345');
  assert.equal(formatNumber(null), '0');
  assert.equal(formatPercent(7.024, 2), '7.02%');
  assert.equal(formatPercent(undefined), '0%');
});

test('shortHash truncates long hashes and keeps short strings intact', () => {
  assert.equal(shortHash(null), '-');
  assert.equal(shortHash('0x123456'), '0x123456');
  assert.equal(shortHash('0x1234567890abcdef1234567890abcdef'), '0x123456…abcdef');
});

test('province helpers extract and match full names and standard aliases', () => {
  assert.equal(extractProvince('Jawa Barat, Bandung'), 'Jawa Barat');
  assert.equal(extractProvince('Nusa Tenggara Timur - Kupang'), 'Nusa Tenggara Timur');
  assert.equal(provinceMatches('Jabar', 'Jawa Barat'), true);
  assert.equal(provinceMatches('NTT', 'Nusa Tenggara Timur'), true);
  assert.equal(provinceMatches('Jakarta', 'DKI Jakarta'), true);
  assert.equal(provinceMatches('Jawa Barat', 'Bali'), false);
  assert.equal(matchesProvinceField('Jawa Barat, Bandung', 'Jabar'), true);
  assert.equal(matchesProvinceField('Bali, Denpasar', 'Jawa Barat'), false);
});
