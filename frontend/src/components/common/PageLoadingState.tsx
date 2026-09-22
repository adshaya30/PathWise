import type { FC } from 'react';
import { Loader2 } from 'lucide-react';

interface PageLoadingStateProps {
  message?: string;
  subMessage?: string;
  className?: string;
}

export const PageLoadingState: FC<PageLoadingStateProps> = ({
  message = 'Loading...',
  subMessage,
  className = 'py-20 md:py-24',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center gap-3 animate-in fade-in duration-150 ${className}`}>
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-slate-500">{message}</p>
        {subMessage && <p className="text-xs text-slate-400">{subMessage}</p>}
      </div>
    </div>
  );
};
