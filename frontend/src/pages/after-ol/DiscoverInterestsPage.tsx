import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft, Search } from 'lucide-react';
import { AfterOlLayout } from '../../components/after-ol/AfterOlLayout';

interface DiscoverOption {
  id: string;
  title: string;
  suggestedSubjects: string[];
}

interface SubjectInterest {
  id: string;
  title: string;
  category: string;
}

const DISCOVER_OPTIONS: DiscoverOption[] = [
  {
    id: 'solving-problems',
    title: 'Solving problems',
    suggestedSubjects: ['mathematics', 'physics', 'chemistry', 'ict'],
  },
  {
    id: 'technology',
    title: 'Working with technology',
    suggestedSubjects: ['ict', 'engineering-technology', 'physics'],
  },
  {
    id: 'how-things-work',
    title: 'Understanding how things work',
    suggestedSubjects: ['physics', 'chemistry', 'engineering-technology'],
  },
  {
    id: 'helping-people',
    title: 'Helping people',
    suggestedSubjects: ['biology', 'health-science', 'political-science'],
  },
  {
    id: 'numbers',
    title: 'Working with numbers',
    suggestedSubjects: ['mathematics', 'accounting', 'economics'],
  },
  {
    id: 'creating-things',
    title: 'Creating things',
    suggestedSubjects: ['arts', 'media-studies', 'engineering-technology'],
  },
  {
    id: 'business-leadership',
    title: 'Business & leadership',
    suggestedSubjects: ['business', 'accounting', 'economics'],
  },
  {
    id: 'languages',
    title: 'Working with languages',
    suggestedSubjects: ['languages', 'media-studies', 'political-science'],
  },
];

const AVAILABLE_SUBJECTS: SubjectInterest[] = [
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

export const DiscoverInterestsPage: FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDiscoverIds, setSelectedDiscoverIds] = useState<string[]>(['languages']);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(['languages', 'media-studies']);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('pathwise_ol_starting_point', 'discover');
  }, []);

  const handleToggleDiscover = (id: string) => {
    setSelectedDiscoverIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNextStep = () => {
    if (selectedDiscoverIds.length === 0) return;
    
    // Suggest matching subjects based on step 1 choices if not already set
    const suggested = new Set<string>(selectedSubjectIds);
    selectedDiscoverIds.forEach((did) => {
      const opt = DISCOVER_OPTIONS.find((o) => o.id === did);
      opt?.suggestedSubjects.forEach((subId) => suggested.add(subId));
    });
    setSelectedSubjectIds(Array.from(suggested));
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExplore = () => {
    const params = new URLSearchParams();
    if (selectedDiscoverIds.length > 0) {
      params.set('discover', selectedDiscoverIds.join(','));
    }
    if (selectedSubjectIds.length > 0) {
      params.set('interests', selectedSubjectIds.join(','));
    }
    navigate(`/after-ol/pathways?${params.toString()}`);
  };

  const filteredSubjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return AVAILABLE_SUBJECTS;
    return AVAILABLE_SUBJECTS.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <AfterOlLayout
      title={step === 1 ? 'What do you enjoy most?' : 'Which subjects feel interesting to you?'}
      subtitle={
        step === 1
          ? 'Select all that apply. There are no right or wrong answers.'
          : 'Based on what you enjoy, here are subjects you can explore. Select the ones you like studying.'
      }
    >
      <div className="space-y-8">
        {/* Step Indicator and Header */}
        <div>
          <div className="flex items-center gap-2 text-[12px] font-bold text-[#0D645B] uppercase tracking-[0.14em] mb-2 font-mono">
            <span>A GENTLE PLACE TO START</span>
            <span className="text-slate-300">·</span>
            <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/60">
              Question {step} of 2
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight leading-tight mb-2 font-heading">
            {step === 1 ? 'What do you enjoy most?' : 'Which subjects feel interesting to you?'}
          </h1>
          <p className="text-sm md:text-base text-[#475569] leading-relaxed max-w-2xl font-normal">
            {step === 1
              ? 'Select all that apply. There are no right or wrong answers.'
              : 'Choose the subjects or areas that feel engaging to you. There are no strict rules.'}
          </p>
        </div>

        {/* STEP 1: General Enjoyment Questions (4 Columns matching design) */}
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DISCOVER_OPTIONS.map((opt) => {
              const isSelected = selectedDiscoverIds.includes(opt.id);

              return (
                <div
                  key={opt.id}
                  onClick={() => handleToggleDiscover(opt.id)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-150 cursor-pointer select-none flex items-center gap-3.5 group min-h-[76px] ${
                    isSelected
                      ? 'bg-[#E6F5F2] border-[#0D645B] text-[#0D645B] shadow-xs ring-2 ring-[#0D645B]/20'
                      : 'bg-white border-slate-200/90 hover:border-[#B3E5DC] hover:bg-[#E6F5F2]/60 hover:text-[#0D645B] hover:shadow-xs text-[#1E293B]'
                  }`}
                >
                  {/* Custom Checkbox Square */}
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#0D645B] border-[#0D645B] text-white'
                        : 'border-slate-300 bg-white group-hover:border-[#0D645B]/50'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  {/* Option Title */}
                  <span className="text-[14.5px] font-bold tracking-tight font-heading leading-snug">
                    {opt.title}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* STEP 2: Specific Subject Interests Grid */}
        {step === 2 && (
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

            {/* 3-Column Subjects Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
              {filteredSubjects.map((subject) => {
                const isSelected = selectedSubjectIds.includes(subject.id);

                return (
                  <div
                    key={subject.id}
                    onClick={() => handleToggleSubject(subject.id)}
                    className={`flex items-center p-5 rounded-2xl border transition-all duration-150 cursor-pointer select-none shadow-2xs group ${
                      isSelected
                        ? 'bg-[#E6F5F2] border-[#0D645B] text-[#0D645B] shadow-xs ring-2 ring-[#0D645B]/20'
                        : 'bg-white border-slate-200/90 hover:border-[#B3E5DC] hover:bg-[#E6F5F2]/60 hover:text-[#0D645B] hover:shadow-xs text-[#1E293B]'
                    }`}
                  >
                    {/* Title */}
                    <span className="text-[15px] font-bold tracking-tight font-heading">
                      {subject.title}
                    </span>
                  </div>
                );
              })}
            </div>

            {filteredSubjects.length === 0 && (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/90 shadow-2xs">
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  No subjects matched "{searchQuery}"
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 text-xs font-bold text-[#0D645B] bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors cursor-pointer mt-2"
                >
                  Show all subjects
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bottom Navigation & Action Bar */}
        <div className="pt-6 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {step === 1 ? (
              selectedDiscoverIds.length > 0 ? (
                <span>
                  Selected{' '}
                  <strong className="text-slate-800 font-bold">
                    {selectedDiscoverIds.length} {selectedDiscoverIds.length === 1 ? 'area' : 'areas'}
                  </strong>
                  :{' '}
                  <span className="text-slate-700 font-medium">
                    {selectedDiscoverIds
                      .map((id) => DISCOVER_OPTIONS.find((o) => o.id === id)?.title || id)
                      .slice(0, 3)
                      .join(', ')}
                    {selectedDiscoverIds.length > 3 ? ` +${selectedDiscoverIds.length - 3} more` : ''}
                  </span>
                </span>
              ) : (
                <span>Select one or more things you enjoy</span>
              )
            ) : selectedSubjectIds.length > 0 ? (
              <span>
                Selected{' '}
                <strong className="text-slate-800 font-bold">
                  {selectedSubjectIds.length} {selectedSubjectIds.length === 1 ? 'subject' : 'subjects'}
                </strong>
                :{' '}
                <span className="text-slate-700 font-medium">
                  {selectedSubjectIds
                    .map((id) => AVAILABLE_SUBJECTS.find((s) => s.id === id)?.title || id)
                    .slice(0, 3)
                    .join(', ')}
                  {selectedSubjectIds.length > 3 ? ` +${selectedSubjectIds.length - 3} more` : ''}
                </span>
              </span>
            ) : (
              <span>Select one or more subjects you enjoy studying</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={selectedDiscoverIds.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#0D645B] hover:bg-[#0A4E46] text-white text-sm font-bold rounded-xl shadow-md shadow-[#0D645B]/20 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Next question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExplore}
                disabled={selectedSubjectIds.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#0D645B] hover:bg-[#0A4E46] text-white text-sm font-bold rounded-xl shadow-md shadow-[#0D645B]/20 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Explore possible pathways</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </AfterOlLayout>
  );
};
