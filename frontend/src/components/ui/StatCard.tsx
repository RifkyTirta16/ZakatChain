import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  icon?: ReactNode;
  tone?: 'emerald' | 'gold' | 'forest' | 'danger' | 'neutral';
  className?: string;
}

const ICON_BG: Record<NonNullable<StatCardProps['tone']>, string> = {
  emerald: 'bg-mint text-primary',
  gold: 'bg-gold/20 text-amber-900',
  forest: 'bg-forest/10 text-forest',
  danger: 'bg-red-50 text-danger',
  neutral: 'bg-slate-100 text-slateText',
};

export const StatCard = ({
  label,
  value,
  sublabel,
  icon,
  tone = 'emerald',
  className = '',
}: StatCardProps) => (
  <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card ${className}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-2 text-2xl sm:text-[28px] font-bold text-forest-dark tabular-nums leading-tight break-words">
          {value}
        </p>
        {sublabel && <p className="mt-1.5 text-xs text-slate-500">{sublabel}</p>}
      </div>
      {icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ICON_BG[tone]}`}>
          {icon}
        </div>
      )}
    </div>
  </div>
);
