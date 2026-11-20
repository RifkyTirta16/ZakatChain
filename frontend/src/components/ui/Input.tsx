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
  hint?: string;
  error?: string;
  required?: boolean;
  min?: number | string;
  step?: number | string;
}

export const Input = ({
  type = 'text',
  placeholder,
  disabled,
  className = '',
  value,
  onChange,
  id,
  label,
  hint,
  error,
  required,
  min,
  step,
}: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slateText">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <input
        type={type}
        id={inputId}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        min={min}
        step={step}
        aria-invalid={Boolean(error)}
        className={`
          w-full min-h-[44px] rounded-[10px] border bg-white py-2.5 px-3.5 text-sm text-forest-dark
          placeholder:text-slate-400 outline-none transition-colors
          focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary
          disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
          ${error ? 'border-danger focus-visible:ring-danger/25 focus-visible:border-danger' : 'border-slate-300'}
          ${className}
        `}
        value={value ?? ''}
        onChange={onChange}
      />
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
};
