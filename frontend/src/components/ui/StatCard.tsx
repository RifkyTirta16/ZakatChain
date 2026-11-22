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
  emerald: 'bg-mint text-primary border border-primary/15',
  gold: 'bg-gold/15 text-amber-900 border border-gold/30',
  forest: 'bg-forest/10 text-forest border border-forest/15',
  danger: 'bg-red-50 text-danger border border-red-200/70',
  neutral: 'bg-slate-100 text-slateText border border-slate-200/80',
};

const TOP_BAR: Record<NonNullable<StatCardProps['tone']>, string> = {
  emerald: 'border-t-2 border-t-primary/70',
  gold: 'border-t-2 border-t-gold',
  forest: 'border-t-2 border-t-forest',
  danger: 'border-t-2 border-t-danger',
  neutral: 'border-t-2 border-t-slate-300',
};

export const StatCard = ({
  label,
  value,
  sublabel,
  icon,
  tone = 'emerald',
  className = '',
}: StatCardProps) => (
  <div
    className={`hairline-elevated rounded-2xl bg-white p-5 transition-colors duration-200 hover:border-slate-300/90 ${TOP_BAR[tone]} ${className}`}
  >
    <div className="flex items-start justify-between gap-2.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 leading-snug">{label}</p>
      {icon && (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ICON_BG[tone]}`}>
          {icon}
        </div>
      )}
    </div>
    <p className="mt-2.5 font-display text-xl sm:text-2xl font-extrabold text-forest-dark tabular-nums tracking-tight leading-snug">
      {value}
    </p>
    {sublabel && (
      <p className="mt-2.5 text-xs text-slate-500 border-t border-slate-100 pt-2">{sublabel}</p>
    )}
  </div>
);
