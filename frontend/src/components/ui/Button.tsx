import type { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
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
}

// Semua class ditulis utuh agar terdeteksi Tailwind (jangan dirakit dengan interpolasi).
const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-gold to-gold-light text-primary-dark shadow-gold-glow',
  secondary:
    'bg-transparent text-primary-dark border-2 border-primary shadow-teal-glow hover:bg-primary-bg',
  danger:
    'bg-gradient-to-br from-coral-dark to-coral text-white shadow-coral-glow',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-4 text-sm',
  md: 'min-h-[44px] px-5 text-base',
  lg: 'min-h-[52px] px-7 text-lg',
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
}: ButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-full font-bold
        transition-transform duration-150 ease-bounce
        active:scale-95
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30
        disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100
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
