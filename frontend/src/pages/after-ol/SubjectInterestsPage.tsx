import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { AfterOlLayout } from '../../components/after-ol/AfterOlLayout';

interface SubjectInterest {
  id: string;
  title: string;
  category?: string;
}

const INITIAL_SUBJECT_INTERESTS: SubjectInterest[] = [
  { id: 'mathematics', title: 'Mathematics', category: 'Science & Mathematics' },
  { id: 'physics', title: 'Physics', category: 'Science & Mathematics' },
  { id: 'chemistry', title: 'Chemistry', category: 'Science & Mathematics' },
  { id: 'biology', title: 'Biology', category: 'Life Sciences' },
  { id: 'ict', title: 'ICT', category: 'Technology' },
  { id: 'business', title: 'Business', category: 'Commerce' },
  { id: 'economics', title: 'Economics', category: 'Commerce & Social Sciences' },
  { id: 'accounting', title: 'Accounting', category: 'Commerce' },
  { id: 'languages', title: 'Languages', category: 'Arts & Humanities' },
  { id: 'arts', title: 'Arts', category: 'Creative & Media' },
  { id: 'agriculture', title: 'Agriculture', category: 'Life Sciences' },
  { id: 'engineering-technology', title: 'Engineering Technology', category: 'Technology' },
  { id: 'media-studies', title: 'Media Studies', category: 'Creative & Media' },
  { id: 'political-science', title: 'Political Science & Law', category: 'Social Sciences' },
  { id: 'health-science', title: 'Health Science', category: 'Life Sciences' },
];

export const SubjectInterestsPage: FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(['mathematics']); // 'mathematics' selected by default

  useEffect(() => {
    localStorage.setItem('pathwise_ol_starting_point', 'interests');
  }, []);

  const filteredInterests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return INITIAL_SUBJECT_INTERESTS;
    return INITIAL_SUBJECT_INTERESTS.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.category && item.category.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExplore = () => {
    if (selectedIds.length === 0) return;
    navigate(`/after-ol/pathways?interests=${selectedIds.join(',')}`);
  };

  return (
    <AfterOlLayout
      title="What subjects or areas do you enjoy?"
      subtitle="Select all that feel interesting to you. Your choices help us suggest study areas worth exploring."
    >
      <div className="space-y-6">
        {/* Search Input Bar */}
        <div className="max-w-xl">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a subject or interest area..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200/90 rounded-2xl text-[14.5px] text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D645B]/20 focus:border-[#0D645B] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Interests Grid (3 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {filteredInterests.map((interest) => {
            const isSelected = selectedIds.includes(interest.id);

            return (
              <div
                key={interest.id}
                onClick={() => handleToggle(interest.id)}
                className={`flex items-center p-5 rounded-2xl border transition-all duration-150 cursor-pointer select-none shadow-2xs group ${
                  isSelected
                    ? 'bg-[#E6F5F2] border-[#0D645B] text-[#0D645B] shadow-xs ring-2 ring-[#0D645B]/20'
                    : 'bg-white border-slate-200/90 hover:border-[#B3E5DC] hover:bg-[#E6F5F2]/60 hover:text-[#0D645B] hover:shadow-xs text-[#1E293B]'
                }`}
              >
                {/* Title */}
                <span className="text-[15px] font-bold tracking-tight font-heading">
                  {interest.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* If no match found */}
        {filteredInterests.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/90 shadow-2xs">
            <p className="text-sm font-semibold text-slate-700 mb-1">
              No subjects matched "{searchQuery}"
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Try searching for a different keyword like "Math", "Science", "Business", or "Art".
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 text-xs font-bold text-[#0D645B] bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors cursor-pointer"
            >
              Show all subjects
            </button>
          </div>
        )}

        {/* Bottom Bar with CTA */}
        <div className="pt-6 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {selectedIds.length > 0 ? (
              <span>
                Selected{' '}
                <strong className="text-slate-800 font-bold">
                  {selectedIds.length} {selectedIds.length === 1 ? 'subject' : 'subjects'}
                </strong>
                :{' '}
                <span className="text-slate-700 font-medium">
                  {selectedIds
                    .map((id) => INITIAL_SUBJECT_INTERESTS.find((s) => s.id === id)?.title || id)
                    .slice(0, 3)
                    .join(', ')}
                  {selectedIds.length > 3 ? ` +${selectedIds.length - 3} more` : ''}
                </span>
              </span>
            ) : (
              <span>Select one or more subjects you enjoy</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleExplore}
            disabled={selectedIds.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#0D645B] hover:bg-[#0A4E46] text-white text-sm font-bold rounded-xl shadow-md shadow-[#0D645B]/20 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>Explore possible pathways</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </AfterOlLayout>
  );
};
