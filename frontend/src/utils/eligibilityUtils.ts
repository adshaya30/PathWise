import type { EligibilityStatus } from '../components/common/EligibilityBadge';
import type {
  AlResultResponse,
  ApiUniversityGroup,
  CutoffItem,
  EligibilitySummary,
  EligibleCourseItem,
} from '../services/after-al/afterAlApiService';
import { formatUniversityName } from '../constants/universities';

export interface EvaluatedCourse {
  id: string;
  uniCode: string;
  courseName: string;
  university: string;
  cutoff: number;
  zScoreDiff: number;
  hasAptitudeTest: boolean;
  status: EligibilityStatus;
  explanation: string;
  chanceCategory?: string;
  prerequisitesMet?: string;
  olRequirementsSummary?: string;
  proposedIntake?: number;
  mediumOfInstruction?: string;
  selectionMethod?: string;
  stream?: string;
  usesEstimatedCutoff?: boolean;
  disadvantagedQuotaApplied?: boolean;
  durationYears?: number;
  durationLabel?: string;
  campus?: string;
  facultyOrSelection?: string;
  alPrerequisitesSummary?: string;
  alMinimumGrade?: string;
  aptitudeTestNotes?: string;
  courseDescription?: string;
  source: 'backend' | 'cutoff';
}

export function mapBackendEligibilityStatus(status?: string): EligibilityStatus | null {
  switch (status) {
    case 'ELIGIBLE':
      return 'Eligible';
    case 'NEEDS_REVIEW':
      return 'Needs review';
    case 'NOT_ELIGIBLE':
      return 'Not eligible';
    default:
      return null;
  }
}

export interface EligibilityCounts {
  all: number;
  eligible: number;
  needsReview: number;
  notEligible: number;
}

export interface UniversityGroup {
  id: string;
  code: string;
  name: string;
  location: string;
  courses: EvaluatedCourse[];
  eligibleCount: number;
  totalMatchedCount: number;
}

export function getStudentGrades(result: AlResultResponse | null): string[] {
  if (!result) return [];
  return [result.subject1Grade, result.subject2Grade, result.subject3Grade].filter(Boolean) as string[];
}

export function hasFailedSubject(result: AlResultResponse | null): boolean {
  return getStudentGrades(result).some((grade) => grade === 'F');
}

export function resolveEligibilityStatus(params: {
  hasFailedSubject: boolean;
  hasAptitudeTest: boolean;
  zScoreDiff: number;
  chanceCategory?: string;
}): EligibilityStatus {
  if (params.hasFailedSubject) return 'Not eligible';
  if (params.hasAptitudeTest) return 'Needs review';
  if (params.chanceCategory === 'REACH_CHANCE') return 'Needs review';
  if (params.zScoreDiff >= -0.05) return 'Eligible';
  if (params.zScoreDiff >= -0.20) return 'Needs review';
  return 'Not eligible';
}

export function buildExplanation(
  status: EligibilityStatus,
  examYear: string,
  prerequisitesMet?: string,
  olRequirementsSummary?: string
): string {
  if (status === 'Not eligible') {
    if (olRequirementsSummary && olRequirementsSummary.toLowerCase().includes('not met')) {
      return olRequirementsSummary;
    }
    return prerequisitesMet || "Minimum required entry criteria threshold is not met, or candidate has failing ('F') grades.";
  }
  if (status === 'Needs review') {
    const parts = [olRequirementsSummary, prerequisitesMet].filter(Boolean);
    if (parts.length > 0) {
      return `${parts.join(' ')} Additional aptitude test or interview criteria may apply.`.trim();
    }
    return 'Borderline Z-score match or mandatory aptitude test criteria must be confirmed.';
  }
  const olNote = olRequirementsSummary ? ` ${olRequirementsSummary}` : '';
  return `Meets published subject and Z-score requirements for ${examYear || '2025/26'}.${olNote}`.trim();
}

export function formatZScoreDiff(diff: number): string {
  return `${diff >= 0 ? '+' : ''}${diff.toFixed(4)}`;
}

export function getUniversityCode(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('colombo') && lower.includes('computing')) return 'UCSC';
  if (lower.includes('colombo')) return 'UOC';
  if (lower.includes('moratuwa')) return 'UOM';
  if (lower.includes('peradeniya')) return 'UOP';
  if (lower.includes('jayewardenepura') || lower.includes('sjp')) return 'USJ';
  if (lower.includes('kelaniya')) return 'UOK';
  if (lower.includes('ruhuna')) return 'UOR';
  if (lower.includes('jaffna')) return 'UOJ';
  if (lower.includes('sabaragamuwa')) return 'SUSL';
  if (lower.includes('wayamba')) return 'WUSL';
  if (lower.includes('uva') || lower.includes('wellassa')) return 'UWU';
  if (lower.includes('south eastern')) return 'SEUSL';
  if (lower.includes('eastern')) return 'EUSL';
  if (lower.includes('rajarata')) return 'RUSL';
  if (lower.includes('visual') || lower.includes('performing')) return 'UVPA';
  if (lower.includes('vavuniya')) return 'VAV';
  return name.substring(0, 4).toUpperCase();
}

export const UNIVERSITY_LOCATIONS: Record<string, string> = {
  UOC: 'Colombo',
  UOM: 'Moratuwa',
  UOP: 'Kandy',
  USJ: 'Nugegoda',
  UOK: 'Kelaniya',
  UOR: 'Matara',
  UOJ: 'Jaffna',
  SUSL: 'Belihuloya',
  WUSL: 'Kuliyapitiya',
  UWU: 'Badulla',
  SEUSL: 'Oluvil',
  EUSL: 'Batticaloa',
  RUSL: 'Mihintale',
  UVPA: 'Colombo',
  GWAI: 'Gampaha',
  SVIAS: 'Vavuniya',
};

function detectAptitudeFromName(degreeName: string): boolean {
  const lower = degreeName.toLowerCase();
  return (
    lower.includes('architecture') ||
    lower.includes('design') ||
    lower.includes('sports') ||
    lower.includes('aptitude') ||
    lower.includes('music') ||
    lower.includes('dance') ||
    lower.includes('art')
  );
}

export function mapBackendItemToEvaluated(
  item: EligibleCourseItem,
  result: AlResultResponse,
  index: number
): EvaluatedCourse {
  const studentZ = Number(result.zScore);
  const cutoff = Number(item.cutoffZScore ?? item.cutoffMark ?? 0);
  const zScoreDiff =
    item.zScoreDifference !== undefined && item.zScoreDifference !== null
      ? Number(item.zScoreDifference)
      : studentZ - cutoff;
  const failed = hasFailedSubject(result);
  const hasAptitudeTest = Boolean(item.hasAptitudeTest);
  const status =
    mapBackendEligibilityStatus(item.eligibilityStatus) ??
    resolveEligibilityStatus({
      hasFailedSubject: failed,
      hasAptitudeTest,
      zScoreDiff,
      chanceCategory: item.chanceCategory,
    });

  const uniCode = item.uniCode || item.courseCode || `UGC-${index + 1}`;
  const university = formatUniversityName(item.universityName) || item.universityName;

  return {
    id: `backend-${uniCode}-${item.courseName}`,
    uniCode,
    courseName: item.courseName,
    university,
    cutoff,
    zScoreDiff,
    hasAptitudeTest,
    status,
    explanation: buildExplanation(status, result.examYear, item.prerequisitesMet, item.olRequirementsSummary),
    chanceCategory: item.chanceCategory,
    prerequisitesMet: item.prerequisitesMet,
    olRequirementsSummary: item.olRequirementsSummary,
    proposedIntake: item.proposedIntake,
    mediumOfInstruction: item.mediumOfInstruction,
    selectionMethod: item.selectionMethod,
    stream: item.stream,
    usesEstimatedCutoff: item.usesEstimatedCutoff,
    disadvantagedQuotaApplied: item.disadvantagedQuotaApplied,
    durationYears: item.durationYears,
    durationLabel: item.durationLabel,
    campus: item.campus,
    facultyOrSelection: item.facultyOrSelection,
    alPrerequisitesSummary: item.alPrerequisitesSummary,
    alMinimumGrade: item.alMinimumGrade,
    aptitudeTestNotes: item.aptitudeTestNotes,
    courseDescription: item.courseDescription,
    source: 'backend',
  };
}

export function mapCutoffToEvaluated(
  cutoff: CutoffItem,
  result: AlResultResponse,
  index: number
): EvaluatedCourse | null {
  if (!cutoff.degree || cutoff.degree.includes('---') || cutoff.degree.startsWith(':') || cutoff.zScore === null) {
    return null;
  }

  const studentZ = Number(result.zScore);
  const cutoffValue = Number(cutoff.zScore);
  const zScoreDiff = studentZ - cutoffValue;
  const hasAptitudeTest = detectAptitudeFromName(cutoff.degree);
  const failed = hasFailedSubject(result);
  const status = resolveEligibilityStatus({
    hasFailedSubject: failed,
    hasAptitudeTest,
    zScoreDiff,
  });
  const university = formatUniversityName(cutoff.university) || cutoff.university;

  return {
    id: `cutoff-${cutoff.id ?? index}-${cutoff.degree}`,
    uniCode: `UGC-${index + 1}`,
    courseName: cutoff.degree,
    university,
    cutoff: cutoffValue,
    zScoreDiff,
    hasAptitudeTest,
    status,
    explanation: buildExplanation(status, result.examYear),
    source: 'cutoff',
  };
}

export function mapApiCoursesToEvaluated(
  courses: EligibleCourseItem[],
  result: AlResultResponse
): EvaluatedCourse[] {
  return courses.map((item, index) => mapBackendItemToEvaluated(item, result, index));
}

export function mapApiUniversityGroups(
  groups: ApiUniversityGroup[],
  result: AlResultResponse
): UniversityGroup[] {
  return groups.map((uni) => ({
    id: uni.id,
    code: uni.code,
    name: uni.name,
    location: UNIVERSITY_LOCATIONS[uni.code] || 'Sri Lanka',
    eligibleCount: uni.eligibleCount,
    totalMatchedCount: uni.totalMatchedCount,
    courses: mapApiCoursesToEvaluated(uni.courses, result),
  }));
}

export function buildEvaluatedCourses(
  result: AlResultResponse,
  eligibility: EligibilitySummary | null | undefined,
  cutoffs: CutoffItem[]
): EvaluatedCourse[] {
  const backendItems = eligibility?.eligibleUniCodes ?? eligibility?.eligibleCourses ?? [];

  if (backendItems.length > 0) {
    return backendItems.map((item, index) => mapBackendItemToEvaluated(item, result, index));
  }

  return cutoffs
    .map((cutoff, index) => mapCutoffToEvaluated(cutoff, result, index))
    .filter((item): item is EvaluatedCourse => item !== null);
}

export function computeEligibilityCounts(courses: EvaluatedCourse[]): EligibilityCounts {
  return {
    all: courses.length,
    eligible: courses.filter((c) => c.status === 'Eligible').length,
    needsReview: courses.filter((c) => c.status === 'Needs review').length,
    notEligible: courses.filter((c) => c.status === 'Not eligible').length,
  };
}

export interface CourseComparisonItem {
  id: string;
  uniCode: string;
  courseName: string;
  university: string;
  faculty: string;
  duration: string;
  requiredGrades: string;
  alPrerequisites?: string;
  olRequirements?: string;
  campus?: string;
  stream?: string;
  cutoff: number;
  zScoreDiff: number;
  status: EligibilityStatus;
  hasAptitudeTest: boolean;
  notes?: string;
  source: string;
  chanceCategory?: string;
  prerequisitesMet?: string;
  proposedIntake?: number;
  mediumOfInstruction?: string;
  courseDescription?: string;
}

export function mapEvaluatedToComparisonItem(
  course: EvaluatedCourse,
  examYear: string
): CourseComparisonItem {
  const alPrerequisites =
    course.alPrerequisitesSummary ||
    course.prerequisitesMet ||
    'Minimum A/L subject requirements for your stream';
  const olRequirements = course.olRequirementsSummary || 'No published O/L requirements';

  return {
    id: course.id,
    uniCode: course.uniCode,
    courseName: course.courseName,
    university: course.university,
    faculty: course.facultyOrSelection || course.selectionMethod || 'Merit & District Quota',
    duration: course.durationLabel || (course.durationYears != null ? `${course.durationYears} years` : '3 / 4 years'),
    requiredGrades: [alPrerequisites, olRequirements].filter(Boolean).join(' · '),
    alPrerequisites,
    olRequirements,
    campus: course.campus,
    stream: course.stream,
    cutoff: course.cutoff,
    zScoreDiff: course.zScoreDiff,
    status: course.status,
    hasAptitudeTest: course.hasAptitudeTest,
    notes:
      course.aptitudeTestNotes ||
      (course.hasAptitudeTest
        ? 'Requires passing the UGC Aptitude Test and interview criteria'
        : undefined),
    source: course.source === 'backend' ? `UGC Database (${examYear || '2025/26'})` : `Cutoff data (${examYear || '2025/26'})`,
    chanceCategory: course.chanceCategory,
    prerequisitesMet: course.prerequisitesMet,
    proposedIntake: course.proposedIntake,
    mediumOfInstruction: course.mediumOfInstruction,
    courseDescription: course.courseDescription,
  };
}

export function buildComparePath(uniCodes: string[]): string {
  const uniqueCodes = Array.from(new Set(uniCodes.filter(Boolean))).slice(0, 4);
  if (uniqueCodes.length === 0) return '/after-al/compare';
  return `/after-al/compare?courses=${uniqueCodes.map(encodeURIComponent).join(',')}`;
}

export function parseCompareCoursesParam(raw: string | null): string[] {
  if (!raw) return [];
  const items = raw
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);
  return Array.from(new Set(items)).slice(0, 4);
}

export function groupCoursesByUniversity(courses: EvaluatedCourse[]): UniversityGroup[] {
  const uniMap = new Map<string, UniversityGroup>();

  courses.forEach((course) => {
    const code = getUniversityCode(course.university);
    const existing = uniMap.get(course.university);

    if (existing) {
      existing.courses.push(course);
      return;
    }

    uniMap.set(course.university, {
      id: code.toLowerCase(),
      code,
      name: course.university,
      location: UNIVERSITY_LOCATIONS[code] || 'Sri Lanka',
      courses: [course],
      eligibleCount: 0,
      totalMatchedCount: 0,
    });
  });

  return Array.from(uniMap.values())
    .map((uni) => {
      const sortedCourses = [...uni.courses].sort((a, b) => b.cutoff - a.cutoff);
      return {
        ...uni,
        courses: sortedCourses,
        eligibleCount: sortedCourses.filter((c) => c.status === 'Eligible').length,
        totalMatchedCount: sortedCourses.length,
      };
    })
    .sort((a, b) => b.eligibleCount - a.eligibleCount || a.name.localeCompare(b.name));
}
