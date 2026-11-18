import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import type { BadgeTone } from '../../utils/status';

type MetricColor = 'primary' | 'success' | 'alert' | 'neutral';

const METRIC_COLOR_CLASS: Record<MetricColor, string> = {
  primary: 'text-wattvision-primary',
  success: 'text-wattvision-success',
  alert: 'text-wattvision-alert',
  neutral: 'text-wattvision-textMain',
};

interface MetricCardProps {
  title: string;
  value: ReactNode;
  unit?: string;
  color?: MetricColor;
  secondaryValue?: ReactNode;
}

export const MetricCard = ({ title, value, unit, color = 'neutral', secondaryValue }: MetricCardProps) => (
  <div className="bg-wattvision-surface p-5 rounded-2xl border border-wattvision-border shadow-sm">
    <p className="text-wattvision-textSecondary text-xs font-medium mb-2 uppercase tracking-widest">{title}</p>
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className={`text-2xl lg:text-3xl font-bold font-mono ${METRIC_COLOR_CLASS[color]}`}>
        {value}
      </span>
      {unit && <span className="text-wattvision-textSecondary font-mono text-sm">{unit}</span>}
    </div>
    {secondaryValue && (
      <p className="text-xs text-wattvision-textSecondary mt-2 font-mono">
        {secondaryValue}
      </p>
    )}
  </div>
);

interface AlertBoxProps {
  message: string;
  type?: 'danger' | 'success' | 'info';
}

export const AlertBox = ({ message, type = 'danger' }: AlertBoxProps) => {
  const styles = {
    danger: 'bg-wattvision-alertBg border-wattvision-alert text-wattvision-alert',
    success: 'bg-wattvision-surface border-wattvision-success text-wattvision-success',
    info: 'bg-wattvision-surface border-wattvision-primary text-wattvision-primary',
  } as const;
  return (
    <div className={`p-4 rounded-lg border-l-4 ${styles[type]}`}>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};

export const LoadingState = ({ label = 'Memuat data…' }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-wattvision-textSecondary">
    <Loader2 className="animate-spin text-wattvision-primary" size={28} />
    <p className="text-xs uppercase tracking-widest font-mono">{label}</p>
  </div>
);

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState = ({ message, onRetry }: ErrorStateProps) => (
  <div className="flex flex-col items-center justify-center gap-4 py-16">
    <AlertTriangle className="text-wattvision-alert" size={32} />
    <p className="text-sm text-wattvision-alert text-center max-w-md font-mono">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold px-4 py-2 rounded-lg border border-wattvision-border text-wattvision-textSecondary hover:border-wattvision-primary hover:text-white transition-colors"
      >
        <RefreshCw size={14} /> Coba Lagi
      </button>
    )}
  </div>
);

export const EmptyState = ({ message, hint }: { message: string; hint?: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-wattvision-textSecondary">
    <Inbox size={32} />
    <p className="text-sm text-center">{message}</p>
    {hint && <p className="text-xs font-mono text-center max-w-sm opacity-70">{hint}</p>}
  </div>
);

const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  success: 'bg-wattvision-success/10 text-wattvision-success border-wattvision-success/30',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  danger: 'bg-wattvision-alert/10 text-wattvision-alert border-wattvision-alert/30',
  neutral: 'bg-wattvision-bg text-wattvision-textSecondary border-wattvision-border',
};

export const StatusBadge = ({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) => (
  <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${BADGE_TONE_CLASS[tone]}`}>
    {label}
  </span>
);
