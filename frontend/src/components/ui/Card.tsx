import type { ReactNode } from 'react';

export interface CardProps {
  variant?: 'default' | 'highlight' | 'anomaly';
  className?: string;
  children: ReactNode;
}

export const Card = ({
  variant = 'default',
  className,
  children,
}: CardProps) => {
  const variantStyles = {
    default: 'border-l-4 border-primary-light',
    highlight: 'border-l-4 bg-gold-light/40',
    anomaly: 'border-l-4 bg-coral-light/40',
  };

  const baseClasses = 'rounded-xl p-6 bg-white shadow-card';

  return (
    <div
      className={`
        ${baseClasses}
        ${variantStyles[variant] || variantStyles.default}
        ${className}
      `}
    >
      {children}
    </div>
  );
};