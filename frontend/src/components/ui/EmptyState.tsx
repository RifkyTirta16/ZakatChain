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
  className,
}: EmptyStateProps) => (
  <div
    className={`
      text-center py-16
      ${className || ''}
    `}
  >
    {icon && <div className="mx-auto mb-4">{icon}</div>}
    {title && <h3 className="text-lg font-medium mb-2">{title}</h3>}
    {description && <p className="text-primary-dark/70 mb-6">{description}</p>}
    {action && <div className="flex justify-center">{action}</div>}
  </div>
);