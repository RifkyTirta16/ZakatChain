import type { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  'aria-label'?: string;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-primary-light to-primary text-white hover:from-primary hover:to-forest shadow-teal-glow border border-primary/80',
  gold:
    'bg-gradient-to-b from-gold-light to-gold text-forest-dark hover:brightness-105 shadow-gold-glow border border-gold-dark/25',
  secondary:
    'bg-white text-forest-dark border border-slate-200/90 shadow-xs hover:bg-mint/70 hover:border-primary/35',
  ghost:
    'bg-transparent text-slateText border border-transparent hover:bg-slate-100/80 hover:text-forest-dark',
  danger:
    'bg-gradient-to-b from-red-500 to-danger text-white hover:to-coral-dark shadow-coral-glow border border-danger/80',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'min-h-[38px] px-3.5 py-2 text-xs sm:text-sm',
  md: 'min-h-[44px] px-5 py-2.5 text-sm',
  lg: 'min-h-[48px] px-6 py-3 text-base',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  onClick,
  'aria-label': ariaLabel,
}: ButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      aria-label={ariaLabel}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-[10px] font-semibold tracking-tight
        transition-all duration-150
        active:scale-[0.98]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100
        ${VARIANT_STYLES[variant]}
        ${SIZE_STYLES[size]}
        ${className}
      `}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
};
