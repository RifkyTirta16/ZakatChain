import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

const STEPS_MD = ['Pilih kampanye', 'Tentukan nominal', 'Bayar', 'Selesai'];
const STEPS_SM = ['Pilih', 'Nominal', 'Bayar', 'Selesai'];

interface JourneyTrackerProps {
  currentStep?: number;
  rejected?: boolean;
  size?: 'sm' | 'md';
}

export const JourneyTracker = ({
  currentStep = 0,
  rejected = false,
  size = 'md',
}: JourneyTrackerProps) => {
  const steps = size === 'sm' ? STEPS_SM : STEPS_MD;
  const isMd = size === 'md';
  const isRow = size === 'md';

  return (
    <div className="w-full">
      <div
        className={`
          flex gap-2 items-center
          ${isRow ? 'flex-row sm:flex-col' : 'flex-col sm:flex-row'}
          w-full sm:w-auto
        `}
      >
        {steps.map((label, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isRejected = rejected && index === currentStep;
          const showConnector = index < steps.length - 1;

          const circleClasses = isRejected
            ? 'w-8 h-8 rounded-full bg-coral text-white border-2 border-coral text-xs font-bold flex items-center justify-center shrink-0'
            : isCompleted
            ? 'w-8 h-8 rounded-full bg-primary text-primary-dark border-2 border-primary flex items-center justify-center shrink-0'
            : isCurrent
            ? 'w-8 h-8 rounded-full bg-gold text-primary-dark border-2 border-gold text-xs font-bold flex items-center justify-center shrink-0'
            : 'w-8 h-8 rounded-full bg-neutral text-neutral border-2 border-neutral text-xs font-bold flex items-center justify-center shrink-0';

          const connectorClasses = isRejected
            ? 'bg-coral'
            : isCompleted || isCurrent
            ? 'bg-primary'
            : 'bg-neutral';

          const labelClasses = isCurrent || isCompleted
            ? 'text-xs font-medium text-primary-dark'
            : 'text-xs font-medium text-primary-dark/40';

          const icon: ReactNode = isRejected ? (
            <span className="text-xs font-bold">!</span>
          ) : isCompleted ? (
            <CheckCircle2 size={16} />
          ) : (
            <span className="text-xs font-bold">{index + 1}</span>
          );

          return (
            <div key={index} className="flex items-center gap-2 w-full sm:w-auto">
              <div className={circleClasses}>{icon}</div>
              {showConnector && (
                <div
                  className={`
                    flex-shrink-0
                    ${isRow ? 'h-px w-4' : 'w-px h-4'}
                    ${connectorClasses}
                  `}
                />
              )}
              <span className={labelClasses}>{label}</span>
            </div>
          );
        })}
      </div>
      {isMd && (
        <p className="mt-2 text-xs text-primary-dark/60">
          On-chain hanya membuktikan hash, bukan penerimaan di lapangan.
        </p>
      )}
    </div>
  );
};
