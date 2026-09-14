import React from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

export interface SelectFieldOption {
  label: string;
  value: string;
}

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string | null;
  options?: readonly (SelectFieldOption | string)[] | (SelectFieldOption | string)[];
}

export function SelectField({
  label,
  icon,
  error,
  options,
  children,
  className = '',
  ...props
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label className="text-sm font-semibold text-text-main">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-4 text-slate-400 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}

        <select
          className={`w-full py-3 bg-white border rounded-xl text-text-main text-sm focus:outline-none transition-all appearance-none cursor-pointer ${
            icon ? 'pl-11' : 'pl-4'
          } pr-10 ${
            error
              ? 'border-red-400 bg-red-50/30 focus:ring-2 focus:ring-red-200 focus:border-red-500'
              : 'border-slate-200 focus:ring-2 focus:ring-deep-blue/20 focus:border-deep-blue'
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => {
                if (typeof opt === 'string') {
                  return (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  );
                }
                return (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                );
              })
            : children}
        </select>

        <div className="absolute right-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
          <ChevronDown size={18} />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium mt-1">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
