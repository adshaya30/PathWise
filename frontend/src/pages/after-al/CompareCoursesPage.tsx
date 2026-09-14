import { useState, useEffect, useMemo, type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, X, Search, BookOpen, GraduationCap, ArrowRight, Loader2 } from 'lucide-react';
import { AfterAlLayout } from '../../components/after-al/AfterAlLayout';
import { EligibilityBadge } from '../../components/common/EligibilityBadge';
import { SavedCourseButton } from '../../components/common/SavedCourseButton';
import { afterAlApiService } from '../../services/after-al/afterAlApiService';
import { useStudentEligibility } from '../../hooks/useStudentEligibility';
import {
  buildComparePath,
  formatZScoreDiff,
  mapApiCoursesToEvaluated,
  mapEvaluatedToComparisonItem,
  parseCompareCoursesParam,
  type CourseComparisonItem,
} from '../../utils/eligibilityUtils';

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
  const { result, courses, hasResult, studentZ, isLoading } = useStudentEligibility();
  const [selectedCourses, setSelectedCourses] = useState<CourseComparisonItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [isCompareLoading, setIsCompareLoading] = useState(false);

  const districtName = result?.district || '';
  const examYear = result?.examYear || '2025/26';

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
        setSelectedCourses(availableCourses.slice(0, Math.min(2, availableCourses.length)));
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
              <h2 className="text-xl font-bold text-slate-900 font-heading">
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
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/40">
                    <th className="p-6 text-xs font-bold uppercase tracking-wider text-slate-400 w-48 min-w-[180px]">
                      Attribute
                    </th>
                    {selectedCourses.map((course) => (
                      <th key={course.id} className="p-6 text-sm font-bold text-slate-900 min-w-[240px] relative group">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{course.courseName}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <SavedCourseButton uniCode={course.uniCode} size="sm" />
                            {selectedCourses.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCourse(course.id)}
                                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                                title="Remove course"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs font-normal text-slate-500 mt-1">{course.university}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{course.uniCode}</p>
                      </th>
                    ))}

                    {selectedCourses.length < 4 && (
                      <th className="p-6 min-w-[180px] align-top">
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(true)}
                          className="w-full h-24 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-blue-600 transition-all cursor-pointer group"
                        >
                          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold">Add Course</span>
                        </button>
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs">
                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-6 font-bold text-slate-400 uppercase tracking-wider">Stream</td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="p-6 text-slate-700 font-medium">
                        {course.stream || result?.stream || '—'}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-6 font-bold text-slate-400 uppercase tracking-wider">Campus</td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="p-6 text-slate-700 font-medium">
                        {course.campus || 'Main / Not specified'}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-6 font-bold text-slate-400 uppercase tracking-wider">Selection Method</td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="p-6 text-slate-700 font-medium">
                        {course.faculty}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-6 font-bold text-slate-400 uppercase tracking-wider">A/L Prerequisites</td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="p-6 text-slate-700 leading-relaxed font-medium">
                        {course.alPrerequisites || course.requiredGrades}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-6 font-bold text-slate-400 uppercase tracking-wider">O/L Requirements</td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="p-6 text-slate-700 leading-relaxed font-medium">
                        {course.olRequirements || 'No published O/L requirements'}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  <tr className="hover:bg-slate-50/40 transition-colors bg-blue-50/20">
                    <td className="p-6 font-bold text-slate-900 uppercase tracking-wider">
                      <div>Cutoff Z-Score</div>
                      <div className="text-[10px] text-blue-600 font-normal lowercase">for {districtName} district</div>
                    </td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="p-6">
                        <div className="text-base font-bold font-mono text-slate-900">{course.cutoff.toFixed(4)}</div>
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-6 font-bold text-slate-400 uppercase tracking-wider">
                      <div>Your Eligibility</div>
                      <div className="text-[10px] text-slate-400 font-normal">Z = {studentZ.toFixed(4)}</div>
                    </td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="p-6 space-y-1">
                        <EligibilityBadge status={course.status} showIcon={true} />
                        <div
                          className={`text-[11px] font-mono font-bold ${
                            course.zScoreDiff >= 0 ? 'text-[#166534]' : 'text-[#991B1B]'
                          }`}
                        >
                          {formatZScoreDiff(course.zScoreDiff)}
                        </div>
                        {course.chanceCategory && (
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {course.chanceCategory.replace(/_/g, ' ')}
                          </div>
                        )}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-6 font-bold text-slate-400 uppercase tracking-wider">Aptitude Test</td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="p-6 text-slate-600">
                        {course.hasAptitudeTest ? (
                          <div className="space-y-1">
                            <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                              Yes, Mandatory
                            </span>
                            {course.notes && <p className="text-[11px] text-slate-500 mt-1">{course.notes}</p>}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">None required</span>
                        )}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-6 font-bold text-slate-400 uppercase tracking-wider">Duration</td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="p-6 text-slate-700 font-medium">
                        {course.duration}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-6 font-bold text-slate-400 uppercase tracking-wider">Proposed Intake</td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="p-6 text-slate-700 font-medium">
                        {course.proposedIntake != null ? course.proposedIntake : 'Not published'}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  <tr className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-6 font-bold text-slate-400 uppercase tracking-wider">Medium</td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="p-6 text-slate-700 font-medium">
                        {course.mediumOfInstruction || 'Not specified'}
                      </td>
                    ))}
                    {selectedCourses.length < 4 && <td />}
                  </tr>

                  <tr className="hover:bg-slate-50/40 transition-colors bg-slate-50/50">
                    <td className="p-6 font-bold text-slate-400 uppercase tracking-wider">Source</td>
                    {selectedCourses.map((course) => (
                      <td key={course.id} className="p-6 text-slate-500 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{course.source}</span>
                        </div>
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
