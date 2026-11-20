import { EthereumLogo } from './EthereumLogo';

interface PoweredByEthereumProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export const PoweredByEthereum = ({ variant = 'light', className = '' }: PoweredByEthereumProps) => {
  const styles =
    variant === 'dark'
      ? 'bg-white/10 border-white/15 text-white/90'
      : 'bg-mint border-primary/20 text-forest';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tracking-tight ${styles} ${className}`}
    >
      <EthereumLogo size={11} monochrome={variant === 'dark'} />
      <span>Powered by Ethereum</span>
    </span>
  );
};
