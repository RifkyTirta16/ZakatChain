import type { ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { ON_CHAIN_NOTE } from './badgeStatus';

const DEFAULT_STEPS_MD = ['Pilih Program', 'Nominal Zakat', 'Pembayaran', 'Selesai'];
const DEFAULT_STEPS_SM = ['Pilih', 'Nominal', 'Bayar', 'Selesai'];

interface JourneyTrackerProps {
  currentStep?: number;
  rejected?: boolean;
  size?: 'sm' | 'md';
  steps?: string[];
  showNote?: boolean;
}

export const JourneyTracker = ({
  currentStep = 0,
  rejected = false,
  size = 'md',
  steps,
  showNote = true,
}: JourneyTrackerProps) => {
  const list = steps ?? (size === 'sm' ? DEFAULT_STEPS_SM : DEFAULT_STEPS_MD);
  const isMd = size === 'md';

  return (
    <div className="w-full">
      <ol className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
        {list.map((label, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isRejected = rejected && index === currentStep;
          const showConnector = index < list.length - 1;

          const circleClasses = isRejected
            ? 'bg-danger text-white border-danger'
            : isCompleted
              ? 'bg-primary text-white border-primary'
              : isCurrent
                ? 'bg-gold/20 text-forest-dark border-gold ring-4 ring-gold/15'
                : 'bg-slate-100 text-slate-400 border-slate-200';

          const labelClasses = isRejected
            ? 'text-danger font-semibold'
            : isCompleted || isCurrent
              ? 'text-forest-dark font-semibold'
              : 'text-slate-400 font-medium';

          const icon: ReactNode = isRejected ? (
            <XCircle size={15} />
          ) : isCompleted ? (
            <CheckCircle2 size={15} />
          ) : (
            <span className="text-xs font-bold tabular-nums">{index + 1}</span>
          );

          return (
            <li key={label} className="flex items-center gap-2 flex-1 min-w-[110px]">
              <div
                className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-colors ${circleClasses}`}
              >
                {icon}
              </div>
              <span className={`text-xs whitespace-nowrap ${labelClasses}`}>{label}</span>
              {showConnector && (
                <div
                  className={`hidden sm:block h-px flex-1 min-w-[16px] ${
                    isCompleted ? 'bg-primary' : 'bg-slate-200'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
      {isMd && showNote && (
        <p className="mt-2.5 text-xs text-slate-500">{ON_CHAIN_NOTE}</p>
      )}
    </div>
  );
};
