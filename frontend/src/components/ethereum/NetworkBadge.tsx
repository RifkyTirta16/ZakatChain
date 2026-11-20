import { EthereumLogo } from './EthereumLogo';
import { useNetworkInfo } from './useNetworkInfo';

interface NetworkBadgeProps {
  variant?: 'light' | 'dark';
  compact?: boolean;
  className?: string;
}

export const NetworkBadge = ({ variant = 'light', compact = false, className = '' }: NetworkBadgeProps) => {
  const { isLoading, isReachable, contract, label } = useNetworkInfo();

  const isHealthy = isReachable && contract === 'Active';
  const dotColor = isLoading
    ? 'bg-gold'
    : isHealthy
      ? 'bg-emerald-500'
      : isReachable
        ? 'bg-amber-500'
        : 'bg-red-500';

  const surface =
    variant === 'dark'
      ? 'bg-white/10 border-white/15 text-white/90'
      : 'bg-white border-slate-200 text-slateText';

  return (
    <span
      title={`RPC: ${isReachable ? 'Terhubung' : 'Tidak Terjangkau'} · Kontrak: ${contract}`}
      className={`inline-flex items-center gap-2 rounded-[10px] border px-3 py-1.5 text-xs font-medium ${surface} ${className}`}
    >
      <EthereumLogo size={11} monochrome={variant === 'dark'} />
      <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
      <span className={compact ? 'truncate max-w-[140px]' : ''}>{label}</span>
    </span>
  );
};
