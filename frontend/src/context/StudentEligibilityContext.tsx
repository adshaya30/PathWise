import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import {
  afterAlApiService,
  type AlResultResponse,
  type CutoffItem,
  type EligibilitySummary,
} from '../services/after-al/afterAlApiService';
import {
  buildEvaluatedCourses,
  computeEligibilityCounts,
  groupCoursesByUniversity,
  mapApiCoursesToEvaluated,
  mapApiUniversityGroups,
  type EligibilityCounts,
  type EvaluatedCourse,
  type UniversityGroup,
} from '../utils/eligibilityUtils';

interface StudentEligibilityContextValue {
  result: AlResultResponse | null;
  eligibility: EligibilitySummary | null;
  courses: EvaluatedCourse[];
  byUniversity: UniversityGroup[];
  counts: EligibilityCounts;
  hasResult: boolean;
  studentZ: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const StudentEligibilityContext = createContext<StudentEligibilityContextValue | null>(null);

export const StudentEligibilityProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [result, setResult] = useState<AlResultResponse | null>(null);
  const [eligibility, setEligibility] = useState<EligibilitySummary | null>(null);
  const [courses, setCourses] = useState<EvaluatedCourse[]>([]);
  const [byUniversity, setByUniversity] = useState<UniversityGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const latestResult = await afterAlApiService.getLatestResults();
      const hasValidResult =
        latestResult &&
        latestResult.zScore !== undefined &&
        latestResult.zScore !== null &&
        Boolean(latestResult.district);

      if (!hasValidResult) {
        setResult(null);
        setEligibility(null);
        setCourses([]);
        setByUniversity([]);
        return;
      }

      setResult(latestResult);

      try {
        // Single catalog call: the universities endpoint already returns every matched
        // course (grouped), enriched once. Calling eligible-courses too would double the
        // enrichment pass for no benefit.
        const universitiesResponse = await afterAlApiService.getUniversities({ filter: 'all' });

        setEligibility(universitiesResponse.summary ?? null);

        const groupedCourses = (universitiesResponse.universities ?? []).flatMap((uni) => uni.courses ?? []);
        setCourses(mapApiCoursesToEvaluated(groupedCourses, latestResult));
        setByUniversity(mapApiUniversityGroups(universitiesResponse.universities ?? [], latestResult));
        return;
      } catch (catalogError) {
        console.warn('Catalog API unavailable, falling back to evaluate/cutoffs:', catalogError);
      }

      let summary = latestResult.eligibilitySummary;
      const backendItems = summary?.eligibleUniCodes ?? summary?.eligibleCourses ?? [];

      if (backendItems.length === 0) {
        try {
          summary = await afterAlApiService.evaluateEligibility();
        } catch (evaluateError) {
          console.warn('Eligibility evaluation fallback failed:', evaluateError);
        }
      }

      setEligibility(summary ?? null);

      let cutoffs: CutoffItem[] = [];
      if ((summary?.eligibleUniCodes ?? summary?.eligibleCourses ?? []).length === 0) {
        cutoffs = await afterAlApiService.getCutoffMarks({
          district: latestResult.district,
          academicYear: latestResult.examYear || '2025/26',
        });
      }

      const evaluated = buildEvaluatedCourses(latestResult, summary, cutoffs);
      setCourses(evaluated);
      setByUniversity(groupCoursesByUniversity(evaluated));
    } catch (loadError) {
      console.error('Failed to load student eligibility:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load eligibility data');
      setResult(null);
      setEligibility(null);
      setCourses([]);
      setByUniversity([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const hasResult = Boolean(result && result.zScore !== undefined && result.zScore !== null);
  const studentZ = hasResult ? Number(result!.zScore) : 0;
  const counts = useMemo(() => computeEligibilityCounts(courses), [courses]);

  const value = useMemo(
    () => ({
      result,
      eligibility,
      courses,
      byUniversity,
      counts,
      hasResult,
      studentZ,
      isLoading,
      error,
      refresh,
    }),
    [result, eligibility, courses, byUniversity, counts, hasResult, studentZ, isLoading, error, refresh]
  );

  return (
    <StudentEligibilityContext.Provider value={value}>{children}</StudentEligibilityContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useStudentEligibility(): StudentEligibilityContextValue {
  const context = useContext(StudentEligibilityContext);
  if (!context) {
    throw new Error('useStudentEligibility must be used within a StudentEligibilityProvider');
  }
  return context;
}
