import React from 'react';

interface PasswordStrengthIndicatorProps {
  password?: string;
  className?: string;
}

export function PasswordStrengthIndicator({
  password = '',
  className = '',
}: PasswordStrengthIndicatorProps) {
  if (!password || password.length === 0) {
    return null;
  }

  // Calculate password strength score and feedback label
  const getStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 0:
      case 1:
        return { score: 1, label: 'Weak — try adding numbers or uppercase letters.' };
      case 2:
        return { score: 2, label: 'Fair — add special characters to strengthen.' };
      case 3:
        return { score: 3, label: 'Good — add a symbol to make it stronger.' };
      case 4:
        return { score: 4, label: 'Strong — excellent password.' };
      default:
        return { score: 2, label: 'Good — add a symbol to make it stronger.' };
    }
  };

  const { score, label } = getStrength(password);

  return (
    <div className={`mt-1 flex flex-col gap-2 ${className}`}>
      {/* 4-Segment Strength Bar */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className={`h-1 rounded-full transition-colors duration-300 ${score >= 1 ? 'bg-teal' : 'bg-slate-200'}`} />
        <div className={`h-1 rounded-full transition-colors duration-300 ${score >= 2 ? 'bg-teal' : 'bg-slate-200'}`} />
        <div className={`h-1 rounded-full transition-colors duration-300 ${score >= 3 ? 'bg-teal' : 'bg-slate-200'}`} />
        <div className={`h-1 rounded-full transition-colors duration-300 ${score >= 4 ? 'bg-teal' : 'bg-slate-200'}`} />
      </div>
      
      {/* Strength Label */}
      <p className="text-xs text-secondary font-medium">
        {label}
      </p>
    </div>
  );
}
