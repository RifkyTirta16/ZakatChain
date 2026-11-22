import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { Card, Input, SectionHeader } from '../../components/ui';
import { formatIDR } from '../../utils/format';
import {
  calculateZakat,
  computeNisab,
  DEFAULT_GOLD_PRICE_IDR,
  parseDigits,
  type ZakatType,
} from '../../utils/zakat';

const ZakatCalculatorPage = () => {
  const [zakatType, setZakatType] = useState<ZakatType>('penghasilan');
  const [goldPriceStr, setGoldPriceStr] = useState(String(DEFAULT_GOLD_PRICE_IDR));

  // Penghasilan inputs (monthly)
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyBonus, setMonthlyBonus] = useState('');
  const [monthlyDebt, setMonthlyDebt] = useState('');

  // Maal inputs (annual/current)
  const [savings, setSavings] = useState('');
  const [investments, setInvestments] = useState('');
  const [shortTermDebt, setShortTermDebt] = useState('');

  // Emas inputs
  const [goldGrams, setGoldGrams] = useState('');
  const [wornGoldGrams, setWornGoldGrams] = useState('');

  const goldPrice = Math.max(0, parseDigits(goldPriceStr));
  const { nisabAnnual, nisabMonthly } = computeNisab(goldPrice);

  const result = useMemo(
    () =>
      calculateZakat({
        zakatType,
        goldPrice,
        monthlyIncome: parseDigits(monthlyIncome),
        monthlyBonus: parseDigits(monthlyBonus),
        monthlyDebt: parseDigits(monthlyDebt),
        savings: parseDigits(savings),
        investments: parseDigits(investments),
        shortTermDebt: parseDigits(shortTermDebt),
        goldGrams: parseDigits(goldGrams),
        wornGoldGrams: parseDigits(wornGoldGrams),
      }),
    [
      zakatType,
      monthlyIncome,
      monthlyBonus,
      monthlyDebt,
      savings,
      investments,
      shortTermDebt,
      goldGrams,
      wornGoldGrams,
      goldPrice,
    ]
  );

  const payHref = result.zakatAmount > 0 ? `/donate?amount=${result.zakatAmount}` : '/donate';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <SectionHeader
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint border border-primary/25 px-3 py-1 text-xs font-semibold text-forest">
            <Calculator size={14} /> Kalkulator Zakat Terukur
          </span>
        }
        title="Hitung Kewajiban Zakat Anda"
        subtitle="Gunakan parameter harga emas yang dapat disesuaikan agar perhitungan nisab 85 gram selalu sesuai kondisi terkini."
      />

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Form Input */}
        <Card className="lg:col-span-7 space-y-6">
          {/* Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100">
            {[
              { id: 'penghasilan', label: 'Penghasilan' },
              { id: 'maal', label: 'Harta / Maal' },
              { id: 'emas', label: 'Emas' },
            ].map((tab) => {
              const active = zakatType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setZakatType(tab.id as ZakatType)}
                  className={`min-h-[42px] rounded-[10px] text-xs sm:text-sm font-semibold transition-all ${
                    active ? 'bg-white text-forest-dark shadow-sm' : 'text-slate-600 hover:text-forest-dark'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Configurable Gold Price Reference */}
          <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 space-y-3">
            <Input
              label="Harga Acuan Emas per Gram (IDR)"
              type="number"
              min="0"
              value={goldPriceStr}
              onChange={(e) => setGoldPriceStr(e.target.value)}
              hint={`Nisab standar 85 gram emas = ${formatIDR(nisabAnnual)}/tahun (${formatIDR(nisabMonthly)}/bulan). Anda dapat mengubah harga emas sesuai acuan terkini.`}
            />
          </div>

          {zakatType === 'penghasilan' && (
            <div className="space-y-4">
              <Input
                label="Penghasilan / Gaji Bulanan (IDR)"
                type="number"
                min="0"
                placeholder="Contoh: 12000000"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
              />
              <Input
                label="Pendapatan Tambahan / Bonus Bulanan (IDR)"
                type="number"
                min="0"
                placeholder="Opsional, contoh: 2000000"
                value={monthlyBonus}
                onChange={(e) => setMonthlyBonus(e.target.value)}
              />
              <Input
                label="Kebutuhan Pokok / Utang Jatuh Tempo Bulan Ini (IDR)"
                type="number"
                min="0"
                placeholder="Opsional, contoh: 0"
                value={monthlyDebt}
                onChange={(e) => setMonthlyDebt(e.target.value)}
              />
            </div>
          )}

          {zakatType === 'maal' && (
            <div className="space-y-4">
              <Input
                label="Saldo Tabungan / Giro / Deposito (IDR)"
                type="number"
                min="0"
                placeholder="Contoh: 150000000"
                value={savings}
                onChange={(e) => setSavings(e.target.value)}
              />
              <Input
                label="Aset Likuid / Investasi Halal (IDR)"
                type="number"
                min="0"
                placeholder="Opsional, contoh: 25000000"
                value={investments}
                onChange={(e) => setInvestments(e.target.value)}
              />
              <Input
                label="Kewajiban / Utang Jatuh Tempo (IDR)"
                type="number"
                min="0"
                placeholder="Opsional, contoh: 0"
                value={shortTermDebt}
                onChange={(e) => setShortTermDebt(e.target.value)}
              />
            </div>
          )}

          {zakatType === 'emas' && (
            <div className="space-y-4">
              <Input
                label="Total Berat Emas yang Dimiliki (Gram)"
                type="number"
                min="0"
                step="0.1"
                placeholder="Contoh: 100"
                value={goldGrams}
                onChange={(e) => setGoldGrams(e.target.value)}
              />
              <Input
                label="Emas Perhiasan Dipakai Wajar (Gram, Opsional)"
                type="number"
                min="0"
                step="0.1"
                placeholder="Opsional, contoh: 0"
                value={wornGoldGrams}
                onChange={(e) => setWornGoldGrams(e.target.value)}
              />
            </div>
          )}
        </Card>

        {/* Calculation Result */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <Card variant={result.eligible ? 'highlight' : 'default'} className="space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-forest-dark">Hasil Perhitungan</h2>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                  result.eligible
                    ? 'bg-mint text-primary border border-primary/25'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {result.eligible ? (
                  <>
                    <CheckCircle2 size={14} /> Mencapai Nisab
                  </>
                ) : (
                  'Belum Mencapai Nisab'
                )}
              </span>
            </div>

            <div className="rounded-xl bg-forest-dark text-white p-5 space-y-1">
              <p className="text-xs uppercase tracking-wider text-white/70">
                Estimasi Zakat {result.periodLabel}
              </p>
              <p className="text-3xl font-extrabold text-gold-light tabular-nums">
                {formatIDR(result.zakatAmount)}
              </p>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-2 py-2 border-b border-slate-100">
                <span className="text-slate-600">Harta / Penghasilan Bersih</span>
                <span className="font-bold text-forest-dark tabular-nums">{formatIDR(result.netBase)}</span>
              </div>
              <div className="flex justify-between gap-2 py-2 border-b border-slate-100">
                <span className="text-slate-600">Batas Nisab ({zakatType === 'penghasilan' ? 'Bulanan' : 'Tahunan'})</span>
                <span className="font-semibold text-forest-dark tabular-nums">{formatIDR(result.nisabTarget)}</span>
              </div>
              <div className="rounded-xl bg-cream p-3 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-forest-dark flex items-center gap-1.5">
                  <Info size={14} className="text-primary" /> Rincian Rumus (Kadar 2,5%)
                </p>
                <p className="font-mono break-all">{result.formulaText}</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <Link
                to={payHref}
                className="w-full inline-flex items-center justify-center gap-2 min-h-[46px] rounded-[10px] bg-primary text-white text-sm font-bold hover:bg-forest shadow-teal-glow transition-colors"
              >
                <span>{result.zakatAmount > 0 ? 'Tunaikan Zakat Sesuai Hasil Ini' : 'Salurkan Infaq / Sedekah'}</span>
                <ArrowRight size={16} />
              </Link>
              {!result.eligible && (
                <p className="text-xs text-slate-500 flex items-start gap-1.5">
                  <Sparkles size={14} className="text-gold-dark shrink-0 mt-0.5" />
                  <span>
                    Bila harta belum mencapai nisab, zakat maal belum wajib; Anda tetap dapat
                    berinfaq atau bersedekah secara sukarela.
                  </span>
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ZakatCalculatorPage;
