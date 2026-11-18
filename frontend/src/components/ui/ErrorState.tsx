import type { ReactNode } from 'react';

export interface ErrorStateProps {
  message?: ReactNode;
  retry?: (e: React.MouseEvent) => void;
  className?: string;
}

export const ErrorState = ({
  message,
  retry,
  className,
}: ErrorStateProps) => (
  <div
    className={`
      rounded-xl border-2 border-danger/50 bg-danger/5 p-8 text-center
      ${className || ''}
    `}
  >
    {message && <p className="text-danger mb-6">{message}</p>}
    {retry && (
      <button
        onClick={retry}
        className="inline-flex items-center min-h-[44px] gap-2 px-4 border border-danger rounded-md text-danger hover:bg-danger/10 outline-none focus-visible:ring-2 focus-visible:ring-danger transition-colors"
      >
        Coba Lagi
      </button>
    )}
  </div>
);