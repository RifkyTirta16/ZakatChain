export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

export const blockchainTone = (status: string | null | undefined): BadgeTone => {
  if (status === 'CONFIRMED') return 'success';
  if (status === 'PENDING_BLOCKCHAIN') return 'warning';
  return 'neutral';
};

export const proofTone = (status: string | null | undefined): BadgeTone => {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  return 'warning';
};
