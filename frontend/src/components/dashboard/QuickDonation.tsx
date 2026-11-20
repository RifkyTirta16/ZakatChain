import { useState } from 'react';
import { HandHeart } from 'lucide-react';
import { formatIDR } from '../../utils/format';
import { Button, Card, Select, Skeleton } from '../../components/ui';
import PaymentModal from '../PaymentModal';
import { useCampaigns } from './hooks/useDashboardData';

const QUICK_AMOUNTS = [50000, 100000, 250000];

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
      setError('Masukkan nominal yang valid.');
      return;
    }
    setIsOpen(true);
  };

  if (campaignsLoading) {
    return (
      <Card className="rounded-2xl p-6">
        <Skeleton lines={3} className="w-full rounded-xl" />
      </Card>
    );
  }

  const campaignOptions = (campaigns ?? []).map((c) => ({
    value: String(c.id),
    label: c.title,
  }));

  return (
    <Card className="rounded-2xl p-6 border-2 border-gold/30 bg-gold-light/20">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-primary-dark/60">Quick Donation</p>
          <h3 className="font-extrabold text-primary-dark text-lg">Donasi Cepat</h3>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenPayment}
          disabled={!isValid}
          className="shadow-gold-glow"
        >
          <HandHeart size={16} className="mr-2" /> Donasi sekarang
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wider text-primary-dark/60">
            Kampanye
          </label>
          <Select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            placeholder="Pilih kampanye"
            options={campaignOptions}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wider text-primary-dark/60">
            Nominal
          </label>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                onClick={() => {
                  setQuickAmount(v);
                  setAmount('');
                  setError('');
                }}
                className={`min-h-[44px] rounded-xl border-2 px-3 py-2 text-sm font-bold text-primary-dark transition-colors ${
                  quickAmount === v
                    ? 'bg-primary-bg border-primary'
                    : 'bg-cream border-transparent hover:border-primary-dark/30'
                }`}
              >
                {formatIDR(v)}
              </button>
            ))}
            <button
              onClick={() => {
                setQuickAmount(null);
                setError('');
              }}
              className={`min-h-[44px] rounded-xl border-2 px-3 py-2 text-sm font-bold text-primary-dark transition-colors ${
                quickAmount === null && amount ? 'bg-primary-bg border-primary' : 'bg-cream border-transparent hover:border-primary-dark/30'
              }`}
            >
              Lainnya
            </button>
          </div>
          {quickAmount === null && (
            <input
              type="number"
              placeholder="Masukkan nominal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setQuickAmount(null);
                setError('');
              }}
              className="w-full min-h-[44px] rounded-xl border border-transparent py-2 px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary bg-cream text-primary-dark"
            />
          )}
          {quickAmount !== null && (
            <p className="text-sm font-bold text-primary-dark">{formatIDR(quickAmount)}</p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-coral-dark bg-coral/5 rounded-xl p-3 border border-coral/30">
            {error}
          </p>
        )}
      </div>

      <PaymentModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        amount={numericAmount}
      />
    </Card>
  );
};
