import { useState } from 'react';
import { HandHeart } from 'lucide-react';
import { formatIDR } from '../../utils/format';
import { Button, Card, Select, Skeleton } from '../../components/ui';
import PaymentModal from '../PaymentModal';
import { useCampaigns } from './hooks/useDashboardData';

const QUICK_AMOUNTS = [50_000, 100_000, 250_000];

export const QuickDonation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [quickAmount, setQuickAmount] = useState<number | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [error, setError] = useState('');

  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns();

  const numericAmount = quickAmount ?? (amount ? Number(amount) : 0);
  const isValid = Number.isFinite(numericAmount) && numericAmount > 0;

  const handleOpenPayment = () => {
    setError('');
    if (!isValid) {
      setError('Masukkan nominal zakat yang valid.');
      return;
    }
    setIsOpen(true);
  };

  if (campaignsLoading) {
    return (
      <Card className="h-full">
        <Skeleton lines={7} />
      </Card>
    );
  }

  const campaignOptions = (campaigns ?? []).map((c) => ({
    value: String(c.id),
    label: c.title,
  }));

  return (
    <Card variant="highlight" className="h-full flex flex-col justify-between gap-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gold/20 text-amber-900 flex items-center justify-center">
            <HandHeart size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-forest-dark">Salurkan Zakat Cepat</h2>
            <p className="text-xs text-slate-500">Pembayaran instan dalam Rupiah (IDR)</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {QUICK_AMOUNTS.map((val) => {
            const active = quickAmount === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setQuickAmount(val);
                  setAmount('');
                  setError('');
                }}
                className={`min-h-[40px] rounded-[10px] border text-xs font-semibold transition-colors tabular-nums ${
                  active
                    ? 'bg-primary text-white border-primary'
                    : 'bg-cream border-slate-200 text-forest-dark hover:bg-mint'
                }`}
              >
                {formatIDR(val)}
              </button>
            );
          })}
        </div>

        <input
          type="number"
          min="1000"
          placeholder="Atau ketik nominal lain (Rp)"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setQuickAmount(null);
            setError('');
          }}
          className="w-full min-h-[44px] rounded-[10px] border border-slate-300 bg-white px-3.5 py-2 text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
        />

        {campaignOptions.length > 0 && (
          <Select
            label="Tujuan Penyaluran (Opsional)"
            placeholder="Zakat Umum (General)"
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            options={[{ value: '', label: 'Zakat Umum (General)' }, ...campaignOptions]}
          />
        )}

        {error && <p className="text-xs font-medium text-danger">{error}</p>}
      </div>

      <Button variant="gold" onClick={handleOpenPayment} className="w-full">
        Lanjutkan Pembayaran
      </Button>

      <PaymentModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        amount={numericAmount}
        campaignId={selectedCampaignId ? Number(selectedCampaignId) : undefined}
      />
    </Card>
  );
};
