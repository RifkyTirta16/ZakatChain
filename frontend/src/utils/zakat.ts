import { formatIDR, formatNumber } from './format';

export type ZakatType = 'penghasilan' | 'maal' | 'emas';

export const NISAB_GOLD_GRAMS = 85;
export const ZAKAT_RATE = 0.025;
// Default reference gold price per gram (IDR) — user-editable so calculation never relies on hidden assumptions.
export const DEFAULT_GOLD_PRICE_IDR = 1_450_000;

export interface ZakatInput {
  zakatType: ZakatType;
  goldPrice: number;
  monthlyIncome?: number;
  monthlyBonus?: number;
  monthlyDebt?: number;
  savings?: number;
  investments?: number;
  shortTermDebt?: number;
  goldGrams?: number;
  wornGoldGrams?: number;
}

export interface ZakatResult {
  netBase: number;
  nisabTarget: number;
  eligible: boolean;
  zakatAmount: number;
  periodLabel: string;
  formulaText: string;
}

export const parseDigits = (raw: string): number => {
  const num = Number(raw.replace(/[^\d.]/g, ''));
  return Number.isFinite(num) && num >= 0 ? num : 0;
};

export const computeNisab = (goldPrice: number): { nisabAnnual: number; nisabMonthly: number } => {
  const safePrice = Number.isFinite(goldPrice) && goldPrice > 0 ? goldPrice : 0;
  const nisabAnnual = NISAB_GOLD_GRAMS * safePrice;
  return { nisabAnnual, nisabMonthly: nisabAnnual / 12 };
};

export const calculateZakat = (input: ZakatInput): ZakatResult => {
  const safeGoldPrice = Number.isFinite(input.goldPrice) && input.goldPrice > 0 ? input.goldPrice : 0;
  const { nisabAnnual, nisabMonthly } = computeNisab(safeGoldPrice);

  if (input.zakatType === 'penghasilan') {
    const income = Math.max(0, input.monthlyIncome ?? 0);
    const bonus = Math.max(0, input.monthlyBonus ?? 0);
    const debt = Math.max(0, input.monthlyDebt ?? 0);
    const net = Math.max(0, income + bonus - debt);
    const eligible = nisabMonthly > 0 && net >= nisabMonthly;
    const zakatAmount = eligible ? Math.round(net * ZAKAT_RATE) : 0;
    return {
      netBase: net,
      nisabTarget: nisabMonthly,
      eligible,
      zakatAmount,
      periodLabel: 'per bulan',
      formulaText: `(${formatIDR(income)} + ${formatIDR(bonus)} - ${formatIDR(debt)}) × 2,5%`,
    };
  }

  if (input.zakatType === 'maal') {
    const savings = Math.max(0, input.savings ?? 0);
    const investments = Math.max(0, input.investments ?? 0);
    const debt = Math.max(0, input.shortTermDebt ?? 0);
    const net = Math.max(0, savings + investments - debt);
    const eligible = nisabAnnual > 0 && net >= nisabAnnual;
    const zakatAmount = eligible ? Math.round(net * ZAKAT_RATE) : 0;
    return {
      netBase: net,
      nisabTarget: nisabAnnual,
      eligible,
      zakatAmount,
      periodLabel: 'per tahun (haul 1 tahun)',
      formulaText: `(${formatIDR(savings)} + ${formatIDR(investments)} - ${formatIDR(debt)}) × 2,5%`,
    };
  }

  const totalGrams = Math.max(0, input.goldGrams ?? 0);
  const wornGrams = Math.max(0, input.wornGoldGrams ?? 0);
  const netGrams = Math.max(0, totalGrams - wornGrams);
  const netValue = netGrams * safeGoldPrice;
  const eligible = netGrams >= NISAB_GOLD_GRAMS && safeGoldPrice > 0;
  const zakatAmount = eligible ? Math.round(netValue * ZAKAT_RATE) : 0;
  return {
    netBase: netValue,
    nisabTarget: nisabAnnual,
    eligible,
    zakatAmount,
    periodLabel: 'per tahun (haul 1 tahun)',
    formulaText: `(${formatNumber(netGrams)} gram × ${formatIDR(safeGoldPrice)}) × 2,5%`,
  };
};
