import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface SlideOverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
}

/** Right-anchored responsive slide-over drawer for receipts, traces, payment flows, and inspections. */
export const SlideOverDrawer = ({
  isOpen,
  onClose,
  title,
  subtitle,
  headerActions,
  children,
  footer,
  widthClass = 'max-w-xl',
}: SlideOverDrawerProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-forest-dark/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full ${widthClass} bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 bsz-print-card`}
      >
        <div className="no-print px-5 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-cream/60">
          <div className="min-w-0">
            <h2 className="font-display text-base sm:text-lg font-bold text-forest-dark truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup panel"
              className="p-2 rounded-[10px] text-slate-500 hover:bg-slate-200/70 hover:text-forest-dark transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {children}
        </div>

        {footer && (
          <div className="no-print px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/70">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
