import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string | null;
  showPasswordToggle?: boolean;
}

export function InputField({
  label,
  type = 'text',
  icon,
  error,
  showPasswordToggle = false,
  className = '',
  ...props
}: InputFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const inputType = showPasswordToggle 
    ? (isPasswordVisible ? 'text' : 'password') 
    : type;

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-semibold text-text-main">
        {label}
      </label>
      
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-4 text-slate-400 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}

        <input
          type={inputType}
          className={`w-full py-3 bg-white border rounded-xl text-text-main placeholder:text-slate-400 text-sm focus:outline-none transition-all ${
            icon ? 'pl-11' : 'pl-4'
          } ${
            showPasswordToggle ? 'pr-11' : 'pr-4'
          } ${
            error
              ? 'border-red-400 bg-red-50/30 focus:ring-2 focus:ring-red-200 focus:border-red-500'
              : 'border-slate-200 focus:ring-2 focus:ring-deep-blue/20 focus:border-deep-blue'
          } ${className}`}
          {...props}
        />

        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-1"
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
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
