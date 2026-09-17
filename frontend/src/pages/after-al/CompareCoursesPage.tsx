import { useState, useEffect, useMemo, type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, X, Search, GraduationCap, ArrowRight, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { AfterAlLayout } from '../../components/after-al/AfterAlLayout';
import { afterAlApiService } from '../../services/after-al/afterAlApiService';
import { useStudentEligibility } from '../../hooks/useStudentEligibility';
import {
  buildComparePath,
  mapApiCoursesToEvaluated,
  mapEvaluatedToComparisonItem,
  parseCompareCoursesParam,
  type CourseComparisonItem,
} from '../../utils/eligibilityUtils';
import { formatDegreeName, formatUniversityName } from '../../constants/universities';

const COMPARE_STORAGE_KEY = 'pathwise_compare_uni_codes';

function loadStoredUniCodes(): string[] {
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((code): code is string => typeof code === 'string') : [];
  } catch {
    return [];
  }
}

function saveStoredUniCodes(codes: string[]): void {
  localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(codes.slice(0, 4)));
}

export type { CourseComparisonItem };

export const CompareCoursesPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { result, courses, hasResult, isLoading } = useStudentEligibility();
  const [selectedCourses, setSelectedCourses] = useState<CourseComparisonItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [isCompareLoading, setIsCompareLoading] = useState(false);

  const districtName = result?.district || '';
  const examYear = result?.examYear || '2026/27';

  const availableCourses: CourseComparisonItem[] = useMemo(() => {
    if (!hasResult) return [];
    return courses.map((course) => mapEvaluatedToComparisonItem(course, examYear));
  }, [courses, examYear, hasResult]);

  const loadCoursesByUniCodes = async (uniCodes: string[]): Promise<CourseComparisonItem[]> => {
    if (!result || uniCodes.length === 0) return [];

    try {
      setIsCompareLoading(true);
      const compareResponse = await afterAlApiService.compareCourses(uniCodes);
      return mapApiCoursesToEvaluated(compareResponse.courses ?? [], result).map((course) =>
        mapEvaluatedToComparisonItem(course, examYear)
      );
    } catch (compareError) {
      console.warn('Compare API unavailable, falling back to local course list:', compareError);
      return uniCodes
        .map((code) => availableCourses.find((c) => c.uniCode.toLowerCase() === code.toLowerCase()))
        .filter((c): c is CourseComparisonItem => c !== undefined);
    } finally {
      setIsCompareLoading(false);
    }
  };

  useEffect(() => {
    if (!hasResult || !result || hasInitializedSelection) return;

    const initializeSelection = async () => {
      const urlCodes = parseCompareCoursesParam(searchParams.get('courses'));
      const storedUniCodes = loadStoredUniCodes();
      const preferredCodes = urlCodes.length > 0 ? urlCodes : storedUniCodes;

      if (preferredCodes.length > 0) {
        const compared = await loadCoursesByUniCodes(preferredCodes);
        if (compared.length > 0) {
          setSelectedCourses(compared);
          setHasInitializedSelection(true);
          return;
        }
      }

      if (availableCourses.length > 0) {
        setSelectedCourses(availableCourses.slice(0, Math.min(4, availableCourses.length)));
      }

      setHasInitializedSelection(true);
    };

    void initializeSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableCourses, examYear, hasInitializedSelection, hasResult, result, searchParams]);

  useEffect(() => {
    if (!hasInitializedSelection) return;

    const codes = selectedCourses.map((c) => c.uniCode).filter(Boolean);
    saveStoredUniCodes(codes);

    const next = codes.length > 0 ? buildComparePath(codes).replace('/after-al/compare', '') : '';
    const current = searchParams.toString() ? `?${searchParams.toString()}` : '';
    if (next !== current) {
      if (codes.length > 0) {
        setSearchParams({ courses: codes.join(',') }, { replace: true });
      } else if (searchParams.has('courses')) {
        setSearchParams({}, { replace: true });
      }
    }
  }, [hasInitializedSelection, selectedCourses, searchParams, setSearchParams]);

  const handleRemoveCourse = (courseId: string) => {
    setSelectedCourses((prev) => prev.filter((c) => c.id !== courseId));
  };

  const handleAddCourse = async (course: CourseComparisonItem) => {
    if (selectedCourses.length >= 4) return;
    if (selectedCourses.some((c) => c.id === course.id || c.uniCode === course.uniCode)) return;

    if (course.uniCode && !course.uniCode.startsWith('UGC-')) {
      const enriched = await loadCoursesByUniCodes([course.uniCode]);
      if (enriched[0]) {
        setSelectedCourses((prev) => [...prev, enriched[0]]);
        setIsAddModalOpen(false);
        setCourseSearchQuery('');
        return;
      }
    }

    setSelectedCourses((prev) => [...prev, course]);
    setIsAddModalOpen(false);
    setCourseSearchQuery('');
  };

  const unselectedCourses = availableCourses.filter(
    (c) =>
      !selectedCourses.some((sel) => sel.id === c.id || sel.uniCode === c.uniCode) &&
      (!courseSearchQuery ||
        c.courseName.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
        c.university.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
        c.uniCode.toLowerCase().includes(courseSearchQuery.toLowerCase()))
  );

  return (
    <AfterAlLayout
      title="Compare Courses"
      subtitle="Compare up to 4 courses side by side with handbook metadata, cutoffs, and your eligibility."
    >
      <div className="space-y-6">
        {isLoading || (hasResult && !hasInitializedSelection) || isCompareLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Loading courses for comparison...</span>
          </div>
        ) : !hasResult ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-10 md:p-14 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-bold text-slate-900">
                Enter Your A/L Results to Compare Courses
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Please enter your A/L stream, district, and Z-Score in the{' '}
                <strong className="text-slate-700">My A/L Results</strong> page to compare degrees against your profile.
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
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-white">
                    <th className="py-6 px-6 text-xs font-bold uppercase tracking-wider text-slate-900 w-52 min-w-[180px]">
                      ATTRIBUTE
                    </th>
                    {selectedCourses.map((course) => (
                      <th key={course.id} className="py-6 px-6 text-sm md:text-[15px] font-bold text-slate-900 min-w-[220px] relative">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{formatDegreeName(course.courseName)}</span>
                          {selectedCourses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCourse(course.id)}
                              className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Remove course"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}

                    {selectedCourses.length < 4 && (
                      <th className="py-6 px-6 min-w-[180px] align-middle">
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(true)}
                          className="py-2 px-4 border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl flex items-center justify-center gap-1.5 text-slate-400 hover:text-blue-600 transition-all cursor-pointer text-xs font-semibold"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Course</span>
                        </button>
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm">
                  {/* UNIVERSITY */}
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-5 px-6 font-bold text-xs text-slate-800 uppercase tracking-wider">
                      UNIVERSITY
                    </td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="py-5 px-6 text-slate-800 font-medium">
                        {formatUniversityName(course.university) || course.university}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  {/* DURATION */}
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-5 px-6 font-bold text-xs text-slate-800 uppercase tracking-wider">
                      DURATION
                    </td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="py-5 px-6 text-slate-700 font-normal">
                        {course.duration || '4 years'}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  {/* A/L PREREQUISITES */}
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-5 px-6 font-bold text-xs text-slate-800 uppercase tracking-wider">
                      A/L PREREQUISITES
                    </td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="py-5 px-6 text-slate-600 leading-relaxed font-normal">
                        {course.alPrerequisites || course.requiredGrades || '3 passes in relevant stream'}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  {/* O/L REQUIREMENTS */}
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-5 px-6 font-bold text-xs text-slate-800 uppercase tracking-wider">
                      O/L REQUIREMENTS
                    </td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="py-5 px-6 text-slate-600 leading-relaxed font-normal">
                        {course.olRequirements || 'No published O/L requirements'}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  {/* APTITUDE TEST */}
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-5 px-6 font-bold text-xs text-slate-800 uppercase tracking-wider">
                      APTITUDE TEST
                    </td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="py-5 px-6">
                        {course.hasAptitudeTest ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Yes, Required
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-sm">None required</span>
                        )}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  {/* PROPOSED INTAKE */}
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-5 px-6 font-bold text-xs text-slate-800 uppercase tracking-wider">
                      PROPOSED INTAKE
                    </td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="py-5 px-6 text-slate-800 font-medium">
                        {course.proposedIntake != null ? `${course.proposedIntake} students` : 'Not published'}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  {/* Z-SCORE (DISTRICT) */}
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-5 px-6 font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Z-SCORE ({districtName ? districtName.toUpperCase() : 'DISTRICT'})
                    </td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="py-5 px-6">
                        <span className="font-bold text-slate-900 text-[15px]">
                          {course.cutoff.toFixed(2)}
                        </span>
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  {/* ELIGIBILITY */}
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-5 px-6 font-bold text-xs text-slate-800 uppercase tracking-wider">
                      ELIGIBILITY
                    </td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="py-5 px-6">
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
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  {/* SOURCE */}
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-5 px-6 font-bold text-xs text-slate-800 uppercase tracking-wider">
                      SOURCE
                    </td>
                    {selectedCourses.map((course, idx) => (
                      <td key={course.id} className="py-5 px-6 text-slate-400 text-xs font-normal">
                        {course.source && course.source.includes('UGC') ? course.source : `UGC ${examYear || '2026/27'}, p.${45 + idx * 13}`}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Select Degree Program to Compare</h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  placeholder="Search by degree name or university..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                {unselectedCourses.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No matching courses available.</p>
                ) : (
                  unselectedCourses.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => void handleAddCourse(c)}
                      className="pt-2 pb-2 px-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{c.courseName}</h4>
                        <p className="text-[11px] text-slate-400">
                          {c.university} · {c.uniCode}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono font-bold text-slate-700">{c.cutoff.toFixed(4)}</span>
                        <div className="text-[10px] text-slate-400">Cutoff</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AfterAlLayout>
  );
};
