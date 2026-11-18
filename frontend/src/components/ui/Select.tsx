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
}

export const Select = ({
  placeholder = 'Pilih opsi',
  disabled,
  className,
  value,
  onChange,
  options,
  id,
  label,
}: SelectProps) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div>
      {label && <label htmlFor={selectId} className="block text-sm font-medium mb-1 text-primary-dark">{label}</label>}
      <select
        id={selectId}
        disabled={disabled}
        className={`
          w-full min-h-[44px] rounded-md border border-transparent py-2 px-3
          outline-none focus-visible:ring-2 focus-visible:ring-primary
          bg-cream text-primary-dark ${className || ''}
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
    </div>
  );
};
