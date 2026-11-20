import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ErrorStateProps {
  message?: ReactNode;
  retry?: (e: React.MouseEvent) => void;
  className?: string;
}

export const ErrorState = ({
  message,
  retry,
  className = '',
}: ErrorStateProps) => (
  <div
    role="alert"
    className={`rounded-2xl border border-red-200 bg-red-50/70 p-6 sm:p-8 text-center ${className}`}
  >
    <div className="mx-auto mb-3 w-11 h-11 rounded-xl bg-red-100 text-danger flex items-center justify-center">
      <AlertCircle size={22} />
    </div>
    {message && <p className="text-sm font-medium text-red-800 max-w-md mx-auto mb-5">{message}</p>}
    {retry && (
      <button
        type="button"
        onClick={retry}
        className="inline-flex items-center min-h-[44px] gap-2 px-4 py-2 rounded-[10px] border border-red-300 bg-white text-sm font-semibold text-red-700 hover:bg-red-50 outline-none focus-visible:ring-2 focus-visible:ring-danger transition-colors"
      >
        <RefreshCw size={15} /> Coba Lagi
      </button>
    )}
  </div>
);
