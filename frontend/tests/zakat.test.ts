import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateZakat,
  computeNisab,
  DEFAULT_GOLD_PRICE_IDR,
  NISAB_GOLD_GRAMS,
  parseDigits,
} from '../src/utils/zakat';

test('parseDigits extracts valid non-negative numbers cleanly', () => {
  assert.equal(parseDigits('12.500.000'.replace(/\./g, '')), 12500000);
  assert.equal(parseDigits('Rp 1500000'), 1500000);
  assert.equal(parseDigits('-500'), 500);
  assert.equal(parseDigits('abc'), 0);
  assert.equal(parseDigits('85.5'), 85.5);
});

test('computeNisab derives 85g annual and 1/12 monthly thresholds', () => {
  const { nisabAnnual, nisabMonthly } = computeNisab(DEFAULT_GOLD_PRICE_IDR);
  assert.equal(nisabAnnual, NISAB_GOLD_GRAMS * DEFAULT_GOLD_PRICE_IDR);
  assert.equal(nisabMonthly, (NISAB_GOLD_GRAMS * DEFAULT_GOLD_PRICE_IDR) / 12);
  assert.deepEqual(computeNisab(-100), { nisabAnnual: 0, nisabMonthly: 0 });
});

test('calculateZakat: penghasilan checks monthly nisab and subtracts debt', () => {
  const below = calculateZakat({
    zakatType: 'penghasilan',
    goldPrice: 1_000_000,
    monthlyIncome: 6_000_000,
    monthlyBonus: 500_000,
    monthlyDebt: 0,
  });
  assert.equal(below.eligible, false);
  assert.equal(below.zakatAmount, 0);

  // Nisab monthly at Rp 1M/g = 85M / 12 = 7,083,333.33
  const above = calculateZakat({
    zakatType: 'penghasilan',
    goldPrice: 1_000_000,
    monthlyIncome: 10_000_000,
    monthlyBonus: 2_000_000,
    monthlyDebt: 2_000_000,
  });
  assert.equal(above.eligible, true);
  assert.equal(above.netBase, 10_000_000);
  assert.equal(above.zakatAmount, 250_000);
});

test('calculateZakat: maal clamps negative net base to zero and enforces annual haul nisab', () => {
  const indebted = calculateZakat({
    zakatType: 'maal',
    goldPrice: 1_000_000,
    savings: 50_000_000,
    investments: 10_000_000,
    shortTermDebt: 80_000_000,
  });
  assert.equal(indebted.netBase, 0);
  assert.equal(indebted.eligible, false);
  assert.equal(indebted.zakatAmount, 0);

  const taxable = calculateZakat({
    zakatType: 'maal',
    goldPrice: 1_000_000,
    savings: 90_000_000,
    investments: 20_000_000,
    shortTermDebt: 10_000_000,
  });
  assert.equal(taxable.netBase, 100_000_000);
  assert.equal(taxable.eligible, true);
  assert.equal(taxable.zakatAmount, 2_500_000);
});

test('calculateZakat: emas subtracts worn jewelry and requires 85g + non-zero gold price', () => {
  const belowAfterWorn = calculateZakat({
    zakatType: 'emas',
    goldPrice: 1_400_000,
    goldGrams: 100,
    wornGoldGrams: 20,
  });
  assert.equal(belowAfterWorn.eligible, false);
  assert.equal(belowAfterWorn.zakatAmount, 0);

  const exactNisab = calculateZakat({
    zakatType: 'emas',
    goldPrice: 1_000_000,
    goldGrams: 100,
    wornGoldGrams: 15,
  });
  assert.equal(exactNisab.eligible, true);
  assert.equal(exactNisab.netBase, 85_000_000);
  assert.equal(exactNisab.zakatAmount, 2_125_000);

  const zeroGoldPrice = calculateZakat({
    zakatType: 'emas',
    goldPrice: 0,
    goldGrams: 100,
  });
  assert.equal(zeroGoldPrice.eligible, false);
});
