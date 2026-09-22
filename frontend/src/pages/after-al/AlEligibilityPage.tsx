import { useMemo, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, Search } from 'lucide-react';
import { AfterAlLayout } from '../../components/after-al/AfterAlLayout';
import { PageLoadingState } from '../../components/common/PageLoadingState';
import { EligibilityBadge, type EligibilityStatus } from '../../components/common/EligibilityBadge';
import { SavedCourseButton } from '../../components/common/SavedCourseButton';
import { useStudentEligibility } from '../../hooks/useStudentEligibility';
import { formatZScoreDiff } from '../../utils/eligibilityUtils';

type FilterType = 'All' | 'Eligible' | 'Needs review' | 'Not eligible';

export const AlEligibilityPage: FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const { courses, counts, hasResult, isLoading } = useStudentEligibility();

  const filteredItems = useMemo(() => {
    return courses
      .filter((item) => {
        const matchesFilter =
          activeFilter === 'All' || item.status.toLowerCase() === activeFilter.toLowerCase();

        const matchesSearch =
          !searchQuery ||
          item.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.explanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.uniCode.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => b.cutoff - a.cutoff);
  }, [activeFilter, searchQuery, courses]);

  const getDotColor = (status: EligibilityStatus) => {
    switch (status) {
      case 'Eligible':
        return '#16A34A';
      case 'Needs review':
        return '#EAB308';
      case 'Not eligible':
        return '#DC2626';
      default:
        return '#94A3B8';
    }
  };

  return (
    <AfterAlLayout
      title="Check Eligibility"
      subtitle="Real-time eligibility for the courses matching your A/L results."
    >
      <div className="space-y-6">
        {isLoading ? (
          <PageLoadingState message="Evaluating your course eligibility..." />
        ) : !hasResult ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-10 md:p-14 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-[#1b497d]/20">
              <img src="/images/after-al-logo.png" alt="PathWise Logo" className="w-16 h-16 rounded-2xl object-cover" />
            </div>
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                Enter Your A/L Results to Check Eligibility
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Please enter your A/L stream, examination subjects, district, and Z-Score in the{' '}
                <strong className="text-slate-700">My A/L Results</strong> page. The eligibility engine will then
                calculate your course eligibility.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/after-al/results')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1b497d] hover:bg-[#153860] text-white rounded-2xl text-sm font-bold shadow-md shadow-[#1b497d]/20 transition-all cursor-pointer"
              >
                <span>Go to My A/L Results</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="w-4.5 h-4.5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search degrees, universities, subjects..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b497d]/20 focus:border-[#1b497d] transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveFilter('All')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'All'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border border-slate-200/60'
                }`}
              >
                All ({counts.all})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('Eligible')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'Eligible'
                    ? 'bg-[#166534] text-white shadow-xs ring-2 ring-[#16A34A]'
                    : 'bg-[#DCFCE7] text-[#166534] border border-[#16A34A]/30 hover:bg-[#bbf7d0]'
                }`}
              >
                Eligible ({counts.eligible})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('Needs review')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'Needs review'
                    ? 'bg-[#854D0E] text-white shadow-xs ring-2 ring-[#EAB308]'
                    : 'bg-[#FEF9C3] text-[#854D0E] border border-[#EAB308]/40 hover:bg-[#fef08a]'
                }`}
              >
                Needs review ({counts.needsReview})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('Not eligible')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'Not eligible'
                    ? 'bg-[#991B1B] text-white shadow-xs ring-2 ring-[#DC2626]'
                    : 'bg-[#FEE2E2] text-[#991B1B] border border-[#DC2626]/30 hover:bg-[#fecaca]'
                }`}
              >
                Not eligible ({counts.notEligible})
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {filteredItems.length === 0 ? (
                <div className="p-12 text-center">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No matching university courses found</p>
                  <p className="text-xs text-slate-400 mt-1">Try selecting a different filter or clearing your search.</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-6 md:p-7 hover:bg-slate-50/60 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 group cursor-pointer"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: getDotColor(item.status) }}
                        />
                        <h3 className="font-extrabold text-slate-900 text-base leading-snug font-heading group-hover:text-[#1b497d] transition-colors">
                          {item.courseName} <span className="font-normal text-slate-400">—</span> {item.university}
                        </h3>
                        <SavedCourseButton uniCode={item.uniCode} size="sm" />
                      </div>

                      <p className="text-slate-600 text-sm pl-5 leading-relaxed font-normal">{item.explanation}</p>

                      <div className="pl-5 pt-1 flex flex-wrap gap-2">
                        <span className="inline-flex items-center text-[11px] font-medium bg-slate-100/90 text-slate-600 px-3 py-1 rounded-md border border-slate-200/70 font-mono tracking-tight">
                          UGC · Code: {item.uniCode}
                        </span>
                        {item.proposedIntake != null && (
                          <span className="inline-flex items-center text-[11px] font-medium bg-purple-50 text-purple-700 px-3 py-1 rounded-md border border-purple-200/70">
                            Intake: {item.proposedIntake}
                          </span>
                        )}
                        {item.mediumOfInstruction && (
                          <span className="inline-flex items-center text-[11px] font-medium bg-teal-50 text-teal-700 px-3 py-1 rounded-md border border-teal-200/70">
                            {item.mediumOfInstruction}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pl-5 lg:pl-0 shrink-0 flex items-center gap-6">
                      <div className="w-28 text-right shrink-0">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Cutoff Z-Score
                        </div>
                        <div className="text-sm md:text-base font-bold text-slate-900 font-mono leading-tight">
                          {item.cutoff.toFixed(4)}
                        </div>
                        <div
                          className={`text-xs font-mono font-bold ${
                            item.zScoreDiff >= 0 ? 'text-[#166534]' : 'text-[#991B1B]'
                          }`}
                        >
                          {formatZScoreDiff(item.zScoreDiff)}
                        </div>
                      </div>

                      <div className="w-32 shrink-0 flex flex-col items-start gap-2">
                        <EligibilityBadge status={item.status} showIcon={true} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </AfterAlLayout>
  );
};
