import type { ReactNode } from 'react';

export interface CardProps {
  variant?: 'default' | 'highlight' | 'anomaly' | 'flat' | 'glass';
  className?: string;
  children: ReactNode;
}

const VARIANT_STYLES: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'hairline-elevated bg-white transition-colors duration-200 hover:border-slate-300/90',
  highlight:
    'hairline-elevated border-t-2 border-t-gold border-slate-200/80 bg-gradient-to-b from-amber-50/35 to-white',
  anomaly: 'border border-danger/25 border-l-4 border-l-danger bg-red-50/45 shadow-card',
  flat: 'border border-slate-200/80 bg-white',
  glass: 'glass-dark-card text-white',
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
