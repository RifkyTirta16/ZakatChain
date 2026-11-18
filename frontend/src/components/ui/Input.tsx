import { useId } from 'react';
import type { ReactNode } from 'react';

export interface InputProps {
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  label?: string;
}

export const Input = ({
  type = 'text',
  placeholder,
  disabled,
  className,
  value,
  onChange,
  id,
  label,
}: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div>
      {label && <label htmlFor={inputId} className="block text-sm font-medium mb-1 text-primary-dark">{label}</label>}
      <input
        type={type}
        id={inputId}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full min-h-[44px] rounded-md border border-transparent py-2 px-3
          outline-none focus-visible:ring-2 focus-visible:ring-primary
          bg-cream text-primary-dark placeholder-primary-dark
          transition-colors ${className || ''}
        `}
        value={value ?? ''}
        onChange={onChange}
      />
    </div>
  );
};
