import type { FC } from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export type EligibilityStatus = 'Eligible' | 'Needs review' | 'Not eligible';

interface EligibilityBadgeProps {
  status?: string | null;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const EligibilityBadge: FC<EligibilityBadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  if (!status) return null;

  const normalized = status.trim().toLowerCase();
  const isSm = size === 'sm';
  const iconSizeClass = isSm ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const paddingClass = isSm ? 'px-2.5 py-0.5 text-[11px]' : 'px-3.5 py-1 text-xs';

  if (normalized === 'eligible') {
    return (
      <span
        style={{
          backgroundColor: '#DCFCE7',
          color: '#166534',
          borderColor: '#16A34A33',
        }}
        className={`inline-flex items-center gap-1.5 rounded-full font-bold border shadow-2xs whitespace-nowrap ${paddingClass}`}
      >
        {showIcon && <CheckCircle2 className={`${iconSizeClass} text-[#16A34A] flex-shrink-0`} />}
        <span>Eligible</span>
      </span>
    );
  }

  if (normalized === 'needs review' || normalized === 'needs_review') {
    return (
      <span
        style={{
          backgroundColor: '#FEF9C3',
          color: '#854D0E',
          borderColor: '#EAB30844',
        }}
        className={`inline-flex items-center gap-1.5 rounded-full font-bold border shadow-2xs whitespace-nowrap ${paddingClass}`}
      >
        {showIcon && <AlertTriangle className={`${iconSizeClass} text-[#EAB308] flex-shrink-0`} />}
        <span>Needs review</span>
      </span>
    );
  }

  if (normalized === 'not eligible' || normalized === 'not_eligible') {
    return (
      <span
        style={{
          backgroundColor: '#FEE2E2',
          color: '#991B1B',
          borderColor: '#DC262633',
        }}
        className={`inline-flex items-center gap-1.5 rounded-full font-bold border shadow-2xs whitespace-nowrap ${paddingClass}`}
      >
        {showIcon && <XCircle className={`${iconSizeClass} text-[#DC2626] flex-shrink-0`} />}
        <span>Not eligible</span>
      </span>
    );
  }

  return null;
};
