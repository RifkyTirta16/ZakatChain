import type { ReactNode } from 'react';

export type BadgeTone =
  | 'sky' | 'gold' | 'primary' | 'success' | 'coral'
  | 'warning' | 'danger' | 'neutral';

export interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}

const TONE_STYLES: Record<BadgeTone, string> = {
  sky: 'bg-sky/15 text-sky-800',
  gold: 'bg-gold/30 text-primary-dark',
  primary: 'bg-primary-bg text-primary-dark',
  success: 'bg-success/15 text-green-800',
  coral: 'bg-coral/15 text-coral-dark',
  warning: 'bg-gold/30 text-primary-dark',
  danger: 'bg-coral/15 text-coral-dark',
  neutral: 'bg-slate-200 text-slate-700',
};

export const Badge = ({ tone = 'neutral', className = '', children }: BadgeProps) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_STYLES[tone]} ${className}`}
  >
    {children}
  </span>
);
