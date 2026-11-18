import type { BadgeTone } from './Badge';

export type ProofStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PENDING_BLOCKCHAIN'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'PAID'
  | 'REJECTED'
  | 'ANOMALY';

export interface ProofBadge {
  tone: BadgeTone;
  label: string;
}

export const ON_CHAIN_NOTE =
  'On-chain hanya membuktikan hash, bukan penerimaan di lapangan';

const PROOF_BADGES: Record<ProofStatus, ProofBadge> = {
  DRAFT: { tone: 'sky', label: 'Diajukan' },
  PENDING: { tone: 'sky', label: 'Diajukan' },
  PENDING_BLOCKCHAIN: { tone: 'sky', label: 'Diajukan' },
  APPROVED: { tone: 'gold', label: 'Ditinjau' },
  CONFIRMED: { tone: 'primary', label: 'Hash tercatat on-chain' },
  PAID: { tone: 'success', label: 'Pembayaran terkonfirmasi' },
  REJECTED: { tone: 'coral', label: 'Ditolak/Anomali' },
  ANOMALY: { tone: 'coral', label: 'Ditolak/Anomali' },
};

const DEFAULT_BADGE: ProofBadge = { tone: 'sky', label: 'Diajukan' };

export const proofBadge = (status: string): ProofBadge =>
  PROOF_BADGES[status as ProofStatus] ?? DEFAULT_BADGE;
