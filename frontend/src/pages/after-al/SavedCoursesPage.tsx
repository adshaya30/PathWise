import { useMemo, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, BookOpen, GraduationCap, ArrowRight, Loader2 } from 'lucide-react';
import { AfterAlLayout } from '../../components/after-al/AfterAlLayout';
import { EligibilityBadge, type EligibilityStatus } from '../../components/common/EligibilityBadge';
import { SavedCourseButton } from '../../components/common/SavedCourseButton';
import { useStudentEligibility } from '../../hooks/useStudentEligibility';
import { useSavedCourses } from '../../hooks/useSavedCourses';
import { formatZScoreDiff } from '../../utils/eligibilityUtils';

export const SavedCoursesPage: FC = () => {
  const navigate = useNavigate();
  const { courses, counts, hasResult, isLoading } = useStudentEligibility();
  const { savedCodes, savedCount, isLoading: savedLoading } = useSavedCourses();

  const savedItems = useMemo(
    () => courses.filter((course) => savedCodes.includes(course.uniCode)),
    [courses, savedCodes]
  );

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
    <AfterAlLayout title="Saved Courses" subtitle="Your bookmarked degree programs, with live eligibility status.">
      <div className="max-w-5xl mx-auto space-y-6 pt-2 pb-12">
        {isLoading || savedLoading ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading your saved courses...</p>
          </div>
        ) : !hasResult ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-10 md:p-14 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-bold text-slate-900 font-heading">Enter Your A/L Results First</h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Save your stream, district, and Z-Score in the{' '}
                <strong className="text-slate-700">My A/L Results</strong> page, then bookmark courses you are
                interested in.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/after-al/results')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <span>Go to My A/L Results</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : savedItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Bookmark className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {savedCount > 0 ? 'No Matching Saved Courses' : 'No Saved Courses Yet'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {savedCount > 0
                ? 'None of your saved courses appear in your current eligibility results.'
                : 'Tap the bookmark icon on any degree in University Courses or Check Eligibility to save it here for later.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/after-al/courses')}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              Browse University Courses
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-600">
                {savedItems.length} of {counts.all} evaluated courses saved
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {savedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-6 md:p-7 hover:bg-slate-50/50 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getDotColor(item.status) }}
                      />
                      <h3 className="font-bold text-slate-900 text-base leading-snug">
                        {item.courseName} <span className="font-normal text-slate-400">—</span> {item.university}
                      </h3>
                    </div>

                    <p className="text-slate-600 text-sm pl-5 leading-relaxed">{item.explanation}</p>

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

                  <div className="pl-5 lg:pl-0 shrink-0 flex items-center gap-4">
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

                    <EligibilityBadge status={item.status} showIcon={true} />
                    <SavedCourseButton uniCode={item.uniCode} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AfterAlLayout>
  );
};