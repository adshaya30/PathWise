import { useState, type FC } from 'react';
import { Bookmark } from 'lucide-react';
import { useSavedCourses } from '../../context/SavedCoursesContext';

interface SavedCourseButtonProps {
  uniCode: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const SavedCourseButton: FC<SavedCourseButtonProps> = ({ uniCode, size = 'md', className = '' }) => {
  const { isSaved, toggle } = useSavedCourses();
  const [pending, setPending] = useState(false);
  const saved = isSaved(uniCode);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      await toggle(uniCode);
    } finally {
      setPending(false);
    }
  };

  const sizeClasses = size === 'sm' ? 'p-1.5' : 'p-2';
  const iconClasses = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={saved ? 'Remove from saved courses' : 'Save course'}
      aria-pressed={saved}
      className={`inline-flex items-center rounded-lg border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1b497d]/30 ${
        sizeClasses
      } ${
        saved
          ? 'bg-[#1b497d] border-[#1b497d] text-white shadow-sm'
          : 'bg-white border-slate-200/80 text-slate-400 hover:text-[#1b497d] hover:border-[#1b497d]/40'
      } ${pending ? 'opacity-60' : ''} ${className}`}
    >
      <Bookmark className={`${iconClasses} ${saved ? 'fill-current' : ''}`} />
    </button>
  );
};