import type { BadgeTone } from './Badge';

export type ProofStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PENDING_BLOCKCHAIN'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'PAID'
  | 'REJECTED'
  | 'REVOKED'
  | 'ANOMALY'
  | 'FAILED'
  | 'EXPIRED'
  | 'OPEN'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'BALANCED'
  | 'DEFICIT'
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CLOSED'
  | 'VERIFIED'
  | 'INACTIVE';

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
  REVOKED: { tone: 'danger', label: 'Dicabut On-Chain' },
  ANOMALY: { tone: 'danger', label: 'Anomali Terdeteksi' },
  FAILED: { tone: 'danger', label: 'Gagal' },
  EXPIRED: { tone: 'neutral', label: 'Kedaluwarsa' },
  OPEN: { tone: 'warning', label: 'Perlu Tindak Lanjut' },
  RESOLVED: { tone: 'success', label: 'Terselesaikan' },
  DISMISSED: { tone: 'neutral', label: 'Diabaikan (Valid)' },
  BALANCED: { tone: 'success', label: 'Saldo Seimbang' },
  DEFICIT: { tone: 'danger', label: 'Selisih / Defisit' },
  CRITICAL: { tone: 'danger', label: 'Kritis' },
  HIGH: { tone: 'warning', label: 'Tinggi' },
  MEDIUM: { tone: 'gold', label: 'Sedang' },
  LOW: { tone: 'neutral', label: 'Rendah' },
  ACTIVE: { tone: 'success', label: 'Aktif' },
  COMPLETED: { tone: 'primary', label: 'Selesai' },
  CLOSED: { tone: 'neutral', label: 'Ditutup' },
  VERIFIED: { tone: 'success', label: 'Terverifikasi' },
  INACTIVE: { tone: 'neutral', label: 'Nonaktif' },
};

const DEFAULT_BADGE: ProofBadge = { tone: 'sky', label: 'Diproses' };

export const proofBadge = (status: string | null | undefined): ProofBadge => {
  const normalized = String(status ?? '').trim().toUpperCase() as ProofStatus;
  return PROOF_BADGES[normalized] ?? DEFAULT_BADGE;
};

export const statusBadge = proofBadge;
