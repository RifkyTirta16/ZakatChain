import type { ReactNode } from 'react';

export interface CardProps {
  variant?: 'default' | 'highlight' | 'anomaly' | 'flat';
  className?: string;
  children: ReactNode;
}

const VARIANT_STYLES: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'border border-slate-200/80 bg-white shadow-card',
  highlight: 'border border-gold/50 border-l-4 border-l-gold bg-white shadow-card',
  anomaly: 'border border-danger/30 border-l-4 border-l-danger bg-red-50/40 shadow-card',
  flat: 'border border-slate-200 bg-white',
};

export const Card = ({
  variant = 'default',
  className = '',
  children,
}: CardProps) => (
  <div
    className={`rounded-2xl p-5 sm:p-6 ${VARIANT_STYLES[variant] ?? VARIANT_STYLES.default} ${className}`}
  >
    {children}
  </div>
);
