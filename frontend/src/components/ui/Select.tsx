import { useId } from 'react';

export interface SelectProps {
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options?: { value: string; label: string }[];
  id?: string;
  label?: string;
  error?: string;
}

export const Select = ({
  placeholder = 'Pilih opsi',
  disabled,
  className = '',
  value,
  onChange,
  options,
  id,
  label,
  error,
}: SelectProps) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-slateText">
          {label}
        </label>
      )}
      <select
        id={selectId}
        disabled={disabled}
        className={`
          w-full min-h-[44px] rounded-[10px] border bg-white py-2.5 px-3.5 text-sm text-forest-dark
          outline-none transition-colors cursor-pointer
          focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary
          disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
          ${error ? 'border-danger' : 'border-slate-300'}
          ${className}
        `}
        value={value ?? ''}
        onChange={onChange}
      >
        <option value="" disabled hidden>{placeholder}</option>
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
};
