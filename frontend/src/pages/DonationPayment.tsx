import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, HeartHandshake, ShieldCheck } from 'lucide-react';
import { Card, ON_CHAIN_NOTE, SectionHeader } from '../components/ui';
import { UnifiedPaymentFlow } from '../components/payment/UnifiedPaymentFlow';

const DonationPayment = () => {
  const [searchParams] = useSearchParams();
  const initialAmount = searchParams.get('amount') ?? '';
  const initialZakatType = searchParams.get('type') ?? 'zakat-penghasilan';
  const initialCampaignId = searchParams.get('campaignId') ?? 'GENERAL';
  const resumeSessionId = searchParams.get('resume');

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      <SectionHeader
        title="Tunaikan Zakat & Infaq"
        subtitle="Alur cepat dalam Rupiah (IDR) melalui QRIS dengan kuitansi resmi BSZ dan pelacakan dampak."
      />

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <Card className="lg:col-span-7">
          <UnifiedPaymentFlow
            initialAmount={initialAmount}
            initialZakatType={initialZakatType}
            initialCampaignId={initialCampaignId}
            resumeSessionId={resumeSessionId}
          />
        </Card>

        <div className="lg:col-span-5 space-y-4">
          <Card variant="highlight" className="space-y-3">
            <h2 className="text-sm font-bold text-forest-dark flex items-center gap-2">
              <HeartHandshake size={17} className="text-primary" /> Jaminan Amanah ZakatChain
            </h2>
            <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
                <span>Minimal <strong>87,5%</strong> dialokasikan langsung kepada mustahik 8 Asnaf; hak kelola amil maksimal <strong>12,5%</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
                <span>Bukti Setor Zakat (BSZ) resmi dapat langsung diunduh/dicetak setelah pembayaran terkonfirmasi.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
                <span>Jika QRIS habis waktu sebelum Anda bayar, sesi dapat diperbarui kapan saja dari riwayat donasi.</span>
              </li>
            </ul>
          </Card>

          <Card className="bg-cream/80 text-xs text-slate-600 flex items-start gap-2">
            <ShieldCheck size={15} className="text-primary shrink-0 mt-0.5" />
            <span>{ON_CHAIN_NOTE}</span>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DonationPayment;
