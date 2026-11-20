import type { BadgeTone } from './Badge';

export type ProofStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PENDING_BLOCKCHAIN'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'PAID'
  | 'REJECTED'
  | 'ANOMALY'
  | 'FAILED'
  | 'EXPIRED';

export interface ProofBadge {
  tone: BadgeTone;
  label: string;
}

export const ON_CHAIN_NOTE =
  'On-chain hanya membuktikan pencatatan hash audit, bukan kebenaran penerimaan zakat di lapangan.';

const PROOF_BADGES: Record<ProofStatus, ProofBadge> = {
  DRAFT: { tone: 'neutral', label: 'Draf' },
  PENDING: { tone: 'warning', label: 'Menunggu' },
  PENDING_BLOCKCHAIN: { tone: 'sky', label: 'Menunggu Pencatatan On-Chain' },
  APPROVED: { tone: 'gold', label: 'Bukti Disetujui' },
  CONFIRMED: { tone: 'primary', label: 'Tercatat On-Chain' },
  PAID: { tone: 'success', label: 'Pembayaran Terkonfirmasi' },
  REJECTED: { tone: 'danger', label: 'Ditolak' },
  ANOMALY: { tone: 'danger', label: 'Anomali Terdeteksi' },
  FAILED: { tone: 'danger', label: 'Gagal' },
  EXPIRED: { tone: 'neutral', label: 'Kedaluwarsa' },
};

const DEFAULT_BADGE: ProofBadge = { tone: 'sky', label: 'Diproses' };

export const proofBadge = (status: string): ProofBadge =>
  PROOF_BADGES[status as ProofStatus] ?? DEFAULT_BADGE;
