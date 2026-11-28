import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Receipt, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge, Button, ON_CHAIN_NOTE } from '../ui';
import { formatIDR } from '../../utils/format';

interface PaymentSuccessCardProps {
  amount: number;
  sessionId: string;
  campaignLabel?: string;
  onReset: () => void;
}

const TRACKING_STAGES = [
  {
    title: '1. Pembayaran QRIS Diterima',
    detail: 'Nominal Rupiah Anda terkonfirmasi lunas oleh sistem pembayaran.',
    done: true,
  },
  {
    title: '2. Dana Masuk Pool Amanah',
    detail: 'Tercatat ke rekening/program amanah untuk disalurkan kepada 8 Asnaf.',
    done: true,
  },
  {
    title: '3. Penyaluran & Audit Bukti Lapangan',
    detail: 'Amil menyalurkan dana dan Auditor memeriksa dokumen bukti fisik.',
    done: false,
  },
  {
    title: '4. Pencatatan Sidik Jari Hash Ethereum',
    detail: 'Hash laporan terverifikasi dikunci pada smart contract agar anti-ubah.',
    done: false,
  },
];

/** Wise-inspired post-payment receipt & 4-stage live progress tracker. */
export const PaymentSuccessCard = ({
  amount,
  sessionId,
  campaignLabel,
  onReset,
}: PaymentSuccessCardProps) => (
  <div className="space-y-5">
    <div className="rounded-2xl border border-emerald-200 bg-mint/70 p-5 text-center space-y-2.5">
      <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto shadow-teal-glow">
        <CheckCircle2 size={24} />
      </div>
      <Badge tone="success">Pembayaran Lunas Terkonfirmasi</Badge>
      <p className="font-display text-2xl font-extrabold text-forest-dark tabular-nums">
        {formatIDR(amount)}
      </p>
      <p className="text-xs text-slate-600">
        {campaignLabel || 'Zakat Umum'} · Ref:{' '}
        <span className="font-mono font-semibold text-forest-dark">{sessionId}</span>
      </p>
    </div>

    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Pelacakan Status Dana Anda
      </p>
      <ol className="space-y-2.5">
        {TRACKING_STAGES.map((stage) => (
          <li key={stage.title} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                stage.done ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {stage.done ? <CheckCircle2 size={12} /> : <Clock size={12} />}
            </span>
            <div>
              <p className={`text-xs font-bold ${stage.done ? 'text-forest-dark' : 'text-slate-600'}`}>
                {stage.title}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">{stage.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>

    <p className="rounded-xl bg-cream border border-slate-200 px-3.5 py-2.5 text-[11px] text-slate-600 flex items-start gap-2">
      <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
      <span>{ON_CHAIN_NOTE}</span>
    </p>

    <div className="flex flex-col sm:flex-row gap-2.5">
      <Link
        to="/my-donations"
        className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-[10px] bg-primary px-4 text-xs sm:text-sm font-semibold text-white hover:bg-forest transition-colors"
      >
        <Receipt size={15} /> Buka Riwayat &amp; Cetak BSZ
      </Link>
      <Button type="button" variant="secondary" onClick={onReset} className="sm:w-auto">
        <RefreshCw size={14} /> Buat Donasi Lain
      </Button>
    </div>
  </div>
);
