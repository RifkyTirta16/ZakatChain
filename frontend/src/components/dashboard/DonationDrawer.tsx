import { SlideOverDrawer } from '../ui';
import { UnifiedPaymentFlow } from '../payment/UnifiedPaymentFlow';

interface DonationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialCampaignId?: number | null;
  resumeSessionId?: string | null;
}

const DonationDrawer = ({
  isOpen,
  onClose,
  initialCampaignId = null,
  resumeSessionId = null,
}: DonationDrawerProps) => (
  <SlideOverDrawer
    isOpen={isOpen}
    onClose={onClose}
    title={resumeSessionId ? 'Lanjutkan Pembayaran QRIS' : 'Tunaikan Zakat'}
    subtitle="Pembayaran QRIS Rupiah instan dengan Bukti Setor Zakat (BSZ) resmi."
    widthClass="max-w-lg"
  >
    <UnifiedPaymentFlow
      key={`${initialCampaignId ?? 'GENERAL'}-${resumeSessionId ?? 'NEW'}`}
      initialCampaignId={initialCampaignId ? String(initialCampaignId) : 'GENERAL'}
      resumeSessionId={resumeSessionId}
      compact
    />
  </SlideOverDrawer>
);

export default DonationDrawer;
