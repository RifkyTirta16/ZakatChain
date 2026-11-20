import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) => (
  <div className={`text-center py-12 px-4 ${className}`}>
    {icon && (
      <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-mint text-primary flex items-center justify-center">
        {icon}
      </div>
    )}
    {title && <h3 className="text-base font-bold text-forest-dark mb-1.5">{title}</h3>}
    {description && <p className="text-sm text-slate-600 max-w-md mx-auto mb-5">{description}</p>}
    {action && <div className="flex justify-center">{action}</div>}
  </div>
);
