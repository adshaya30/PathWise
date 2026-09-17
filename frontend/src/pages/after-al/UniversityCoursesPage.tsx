import { useMemo, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, CheckCircle2, AlertTriangle, XCircle, GraduationCap, ArrowRight, BarChart2 } from 'lucide-react';
import { AfterAlLayout } from '../../components/after-al/AfterAlLayout';
import { EligibilityBadge } from '../../components/common/EligibilityBadge';
import { SavedCourseButton } from '../../components/common/SavedCourseButton';
import { afterAlApiService } from '../../services/after-al/afterAlApiService';
import { useStudentEligibility } from '../../hooks/useStudentEligibility';
import { buildComparePath, mapApiCoursesToEvaluated, type EvaluatedCourse } from '../../utils/eligibilityUtils';
import { formatDegreeName, formatUniversityName } from '../../constants/universities';

export const UniversityCoursesPage: FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [expandedUniId, setExpandedUniId] = useState<string | null>(null);
  const [selectedCourseInfo, setSelectedCourseInfo] = useState<{ course: EvaluatedCourse; uniName: string } | null>(
    null
  );

  const { result, byUniversity, counts, hasResult, studentZ, isLoading } = useStudentEligibility();
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const openCourseDetail = async (course: EvaluatedCourse, uniName: string) => {
    setSelectedCourseInfo({ course, uniName });

    if (!result || !course.uniCode || course.uniCode.startsWith('UGC-')) {
      return;
    }

    setIsDetailLoading(true);
    try {
      const detailResponse = await afterAlApiService.getCourseDetail(course.uniCode);
      const detailed = mapApiCoursesToEvaluated(detailResponse.courses ?? [], result)[0];
      if (detailed) {
        setSelectedCourseInfo({ course: detailed, uniName });
      }
    } catch (detailError) {
      console.warn('Course detail API unavailable:', detailError);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const filteredUniversities = useMemo(() => {
    return byUniversity
      .map((uni) => {
        const matchedCourses = uni.courses
          .filter((course) => {
            const matchesQuery =
              !searchQuery ||
              course.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              uni.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              uni.code.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = selectedStatusFilter === 'All' || course.status === selectedStatusFilter;

            return matchesQuery && matchesStatus;
          })
          .sort((a, b) => b.cutoff - a.cutoff || a.courseName.localeCompare(b.courseName));

        const topCutoff = matchedCourses.reduce((max, c) => Math.max(max, c.cutoff), Number.NEGATIVE_INFINITY);

        return {
          ...uni,
          courses: matchedCourses,
          eligibleCount: matchedCourses.filter((c) => c.status === 'Eligible').length,
          totalMatchedCount: matchedCourses.length,
          topCutoff,
        };
      })
      .filter((uni) => uni.totalMatchedCount > 0)
      .sort(
        (a, b) =>
          b.topCutoff - a.topCutoff ||
          b.eligibleCount - a.eligibleCount ||
          a.name.localeCompare(b.name),
      );
  }, [byUniversity, searchQuery, selectedStatusFilter]);

  return (
    <AfterAlLayout title="University Courses" subtitle="Find degrees and university cutoff marks across all state institutions.">
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Loading universities and degree cutoffs...</span>
          </div>
        ) : !hasResult ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-10 md:p-14 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                Enter Your A/L Results to View University Courses
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Please enter your A/L stream, district, and Z-Score in the{' '}
                <strong className="text-slate-700">My A/L Results</strong> page. The system will then display degree
                courses matching your profile.
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
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'Eligible' ? 'All' : 'Eligible')}
                className={`p-5 rounded-3xl border transition-all text-left cursor-pointer flex flex-col justify-between group ${selectedStatusFilter === 'Eligible'
                    ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-xs'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Eligible</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-bold text-emerald-950 font-heading tracking-tight">
                    {counts.eligible}
                  </div>
                  <p className="text-xs text-emerald-700/80 mt-1 font-medium">Courses cleared by your Z-Score</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'Needs review' ? 'All' : 'Needs review')}
                className={`p-5 rounded-3xl border transition-all text-left cursor-pointer flex flex-col justify-between group ${selectedStatusFilter === 'Needs review'
                    ? 'bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200/80 hover:border-amber-300 hover:shadow-xs'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Needs Review</span>
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-bold text-amber-950 font-heading tracking-tight">
                    {counts.needsReview}
                  </div>
                  <p className="text-xs text-amber-700/80 mt-1 font-medium">Requires Aptitude Test / borderline match</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'Not eligible' ? 'All' : 'Not eligible')}
                className={`p-5 rounded-3xl border transition-all text-left cursor-pointer flex flex-col justify-between group ${selectedStatusFilter === 'Not eligible'
                    ? 'bg-rose-50/80 border-rose-500 shadow-md ring-2 ring-rose-500/20'
                    : 'bg-white border-slate-200/80 hover:border-rose-300 hover:shadow-xs'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Not Eligible</span>
                  <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-bold text-rose-950 font-heading tracking-tight">
                    {counts.notEligible}
                  </div>
                  <p className="text-xs text-rose-700/80 mt-1 font-medium">Z-Score below published cutoffs</p>
                </div>
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search university or degree course..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {['All', 'Eligible', 'Needs review', 'Not eligible'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSelectedStatusFilter(status)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedStatusFilter === status
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {filteredUniversities.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
                <p className="text-base font-bold text-slate-800">No university courses found</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing your filters or changing your search keywords.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredUniversities.map((uni) => (
                  <div
                    key={uni.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top Header */}
                      <div>
                        <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-blue-50 text-blue-600 font-bold text-xs">
                          {uni.code}
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg font-heading tracking-tight mt-2.5">
                          {formatUniversityName(uni.name)}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {uni.location} · {uni.eligibleCount} eligible course{uni.eligibleCount !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Course List */}
                      <div className="mt-5 space-y-3.5">
                        {uni.courses.slice(0, expandedUniId === uni.id ? undefined : 3).map((course) => (
                          <div
                            key={course.id}
                            onClick={() => void openCourseDetail(course, uni.name)}
                            className="flex items-center justify-between gap-3 group cursor-pointer hover:bg-slate-50/50 -mx-2 px-2 py-1 rounded-xl transition-colors"
                          >
                            <span className="font-semibold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                              {formatDegreeName(course.courseName)}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              {course.status === 'Eligible' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Eligible
                                </span>
                              )}
                              {course.status === 'Needs review' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  Needs review
                                </span>
                              )}
                              {course.status === 'Not eligible' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                  Not eligible
                                </span>
                              )}
                              <SavedCourseButton uniCode={course.uniCode} size="sm" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setExpandedUniId(expandedUniId === uni.id ? null : uni.id)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer group"
                      >
                        <span>
                          {expandedUniId === uni.id
                            ? 'Show fewer courses'
                            : uni.courses.length > 3
                            ? `View all ${uni.courses.length} courses`
                            : 'View all courses'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {selectedCourseInfo && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    {selectedCourseInfo.uniName}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">{selectedCourseInfo.course.courseName}</h3>
                </div>
                <EligibilityBadge status={selectedCourseInfo.course.status} showIcon={true} />
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                {isDetailLoading && (
                  <p className="text-xs text-slate-400 italic">Refreshing course details from server...</p>
                )}

                {selectedCourseInfo.course.hasAptitudeTest && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 space-y-1">
                    <div className="font-bold uppercase tracking-wider text-[10px] text-amber-700">
                      Special Admission Requirement
                    </div>
                    <p>
                      {selectedCourseInfo.course.aptitudeTestNotes ||
                        'Requires passing the UGC Aptitude Test and meeting interview criteria.'}
                    </p>
                  </div>
                )}

                {selectedCourseInfo.course.courseDescription && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">About this course</span>
                    <p className="text-sm text-slate-700 mt-0.5">{selectedCourseInfo.course.courseDescription}</p>
                  </div>
                )}

                {selectedCourseInfo.course.alPrerequisitesSummary && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">A/L Prerequisites</span>
                    <p className="text-sm text-slate-700 mt-0.5">{selectedCourseInfo.course.alPrerequisitesSummary}</p>
                  </div>
                )}

                {!selectedCourseInfo.course.alPrerequisitesSummary && selectedCourseInfo.course.prerequisitesMet && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">A/L Prerequisites</span>
                    <p className="text-sm text-slate-700 mt-0.5">{selectedCourseInfo.course.prerequisitesMet}</p>
                  </div>
                )}

                {selectedCourseInfo.course.olRequirementsSummary && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">O/L Requirements</span>
                    <p className="text-sm text-slate-700 mt-0.5">{selectedCourseInfo.course.olRequirementsSummary}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {(selectedCourseInfo.course.durationLabel || selectedCourseInfo.course.durationYears != null) && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Duration</span>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">
                        {selectedCourseInfo.course.durationLabel ||
                          `${selectedCourseInfo.course.durationYears} years`}
                      </div>
                    </div>
                  )}
                  {selectedCourseInfo.course.campus && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Campus</span>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedCourseInfo.course.campus}</div>
                    </div>
                  )}
                  {selectedCourseInfo.course.proposedIntake != null && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Proposed Intake</span>
                      <div className="text-base font-bold text-slate-900 mt-0.5">{selectedCourseInfo.course.proposedIntake}</div>
                    </div>
                  )}
                  {selectedCourseInfo.course.mediumOfInstruction && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Medium</span>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedCourseInfo.course.mediumOfInstruction}</div>
                    </div>
                  )}
                  {selectedCourseInfo.course.facultyOrSelection && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 col-span-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Selection Method</span>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedCourseInfo.course.facultyOrSelection}</div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Cutoff Z-Score</span>
                    <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                      {selectedCourseInfo.course.cutoff.toFixed(4)}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Your Z-Score</span>
                    <div className="text-base font-bold text-slate-900 font-mono mt-0.5">{studentZ.toFixed(4)}</div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                {selectedCourseInfo.course.uniCode && !selectedCourseInfo.course.uniCode.startsWith('UGC-') && (
                  <button
                    type="button"
                    onClick={() => navigate(buildComparePath([selectedCourseInfo.course.uniCode]))}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    Compare Course
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedCourseInfo(null)}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AfterAlLayout>
  );
};
