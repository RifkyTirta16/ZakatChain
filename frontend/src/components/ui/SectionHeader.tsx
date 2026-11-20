import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

export const SectionHeader = ({
  title,
  subtitle,
  action,
  badge,
  className = '',
}: SectionHeaderProps) => (
  <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 ${className}`}>
    <div>
      {badge && <div className="mb-2">{badge}</div>}
      <h2 className="text-xl sm:text-2xl font-bold text-forest-dark">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-600 max-w-2xl">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
