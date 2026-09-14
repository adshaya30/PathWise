import type { FC } from 'react';

interface AiSparkleIconProps {
  className?: string;
}

/**
 * Custom AI Sparkle Icon matching the official PathWise AI brand symbol:
 * - Smooth 4-point central star
 * - Top-right spark (+)
 * - Bottom-left accent dot
 */
export const AiSparkleIcon: FC<AiSparkleIconProps> = ({ className = 'w-5 h-5 text-yellow-400' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Central 4-pointed sparkle star */}
      <path d="M12 3.5C12 7.5 10 9.5 6 9.5C10 9.5 12 11.5 12 15.5C12 11.5 14 9.5 18 9.5C14 9.5 12 7.5 12 3.5Z" />
      
      {/* Top right spark (+) */}
      <path d="M19 2.5V5.5" />
      <path d="M20.5 4H17.5" />
      
      {/* Bottom left accent dot */}
      <circle cx="5.5" cy="18.5" r="1.5" fill="currentColor" />
    </svg>
  );
};
