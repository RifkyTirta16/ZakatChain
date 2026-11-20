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
  sky: 'bg-sky/10 text-sky border border-sky/25',
  gold: 'bg-gold/15 text-amber-900 border border-gold/40',
  primary: 'bg-mint text-forest border border-primary/25',
  success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  coral: 'bg-red-50 text-red-700 border border-red-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
  neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
};

export const Badge = ({ tone = 'neutral', className = '', children }: BadgeProps) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_STYLES[tone]} ${className}`}
  >
    {children}
  </span>
);
