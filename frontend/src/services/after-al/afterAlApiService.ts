import { authApiService } from '../authApiService';

export interface SubjectGrade {
  name: string;
  grade: string;
}

export interface AlResultPayload {
  stream: string;
  examYear: string;
  district: string;
  attemptNumber?: number;
  subject1: string;
  subject1Grade: string;
  subject2: string;
  subject2Grade: string;
  subject3: string;
  subject3Grade: string;
  englishGrade?: string;
  cgtMarks?: number;
  zScore: number;
  olEnglish?: string;
  olMathematics?: string;
  olScience?: string;
  olLanguage?: string;
  anonymousId?: string;
}

export interface EligibleCourseItem {
  courseCode?: string;
  courseName: string;
  uniCode?: string;
  universityName: string;
  cutoffMark?: number;
  cutoffZScore?: number;
  studentZScore?: number;
  zScoreDifference?: number;
  chanceCategory?: string;
  eligibilityStatus?: 'ELIGIBLE' | 'NEEDS_REVIEW' | 'NOT_ELIGIBLE';
  proposedIntake?: number;
  mediumOfInstruction?: string;
  hasAptitudeTest?: boolean;
  prerequisitesMet?: string;
  olRequirementsMet?: boolean;
  olRequirementsSummary?: string;
  usesEstimatedCutoff?: boolean;
  disadvantagedQuotaApplied?: boolean;
  stream?: string;
  selectionMethod?: string;
  durationYears?: number;
  durationLabel?: string;
  campus?: string;
  facultyOrSelection?: string;
  alPrerequisitesSummary?: string;
  alMinimumGrade?: string;
  aptitudeTestNotes?: string;
  courseDescription?: string;
}

export interface EligibilitySummary {
  isEligible?: boolean;
  ineligibilityReason?: string;
  district?: string;
  studentDistrict?: string;
  stream?: string;
  studentStream?: string;
  studentZScore?: number;
  attemptNumber?: number;
  isDisadvantagedDistrict?: boolean;
  totalEligibleUniCodes?: number;
  totalEligibleCourses?: number;
  highChanceCount?: number;
  moderateChanceCount?: number;
  targetChanceCount?: number;
  reachChanceCount?: number;
  academicYear?: string;
  eligibleUniCodes?: EligibleCourseItem[];
  eligibleCourses?: EligibleCourseItem[];
  summaryMessage?: string;
}

export interface AlResultResponse {
  id: string;
  userEmail?: string;
  anonymousId?: string;
  stream: string;
  examYear: string;
  district: string;
  attemptNumber: number;
  subject1: string;
  subject1Grade: string;
  subject2: string;
  subject2Grade: string;
  subject3: string;
  subject3Grade: string;
  englishGrade?: string;
  cgtMarks?: number;
  zScore: number;
  olEnglish?: string;
  olMathematics?: string;
  olScience?: string;
  olLanguage?: string;
  createdAt: string;
  updatedAt: string;
  eligibilitySummary?: EligibilitySummary;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const getAnonymousId = (): string => {
  let anonId = localStorage.getItem('pathwise_anon_id');
  if (!anonId) {
    anonId = 'anon_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('pathwise_anon_id', anonId);
  }
  return anonId;
};

const getHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Anonymous-Id': getAnonymousId(),
  };

  const token = authApiService.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

export interface CutoffItem {
  id: number;
  academicYear: string;
  degree: string;
  university: string;
  district: string;
  zScore: number | null;
  mediumOfInstruction?: string;
}

export interface CutoffFilterOptions {
  academicYears: string[];
  districts: string[];
}

export type EligibleCourseFilter =
  | 'all'
  | 'eligible'
  | 'needs_review'
  | 'not_eligible'
  | 'high'
  | 'target'
  | 'reach';

export interface AfterAlCatalogResponse {
  summary: EligibilitySummary;
  filter?: string;
  search?: string | null;
  totalReturned: number;
  courses: EligibleCourseItem[];
}

export interface ApiUniversityGroup {
  id: string;
  code: string;
  name: string;
  eligibleCount: number;
  needsReviewCount: number;
  notEligibleCount: number;
  totalMatchedCount: number;
  courses: EligibleCourseItem[];
}

export interface AfterAlUniversitiesResponse {
  summary: EligibilitySummary;
  totalUniversities: number;
  universities: ApiUniversityGroup[];
}

export const afterAlApiService = {
  /**
   * Save or update student's A/L and O/L exam results
   */
  async saveResults(data: AlResultPayload): Promise<AlResultResponse> {
    const payload = {
      ...data,
      anonymousId: getAnonymousId(),
    };

    const response = await fetch(`${API_BASE_URL}/after-al/results`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || `Failed to save results (${response.status})`);
    }

    return response.json();
  },

  /**
   * Fetch the active student's previously saved results
   */
  async getLatestResults(): Promise<AlResultResponse | null> {
    const anonId = getAnonymousId();
    const response = await fetch(`${API_BASE_URL}/after-al/results?anonymousId=${encodeURIComponent(anonId)}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (response.status === 204 || response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return response.json();
  },

  /**
   * Evaluate eligibility for degree courses
   */
  async evaluateEligibility(): Promise<EligibilitySummary> {
    const anonId = getAnonymousId();
    const response = await fetch(`${API_BASE_URL}/after-al/evaluate?anonymousId=${encodeURIComponent(anonId)}`, {
      method: 'POST',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || `Eligibility evaluation failed (${response.status})`);
    }

    return response.json();
  },

  /**
   * Fetch real published cutoff marks from database with search and filters
   */
  async getCutoffMarks(params?: { academicYear?: string; district?: string; search?: string }): Promise<CutoffItem[]> {
    const query = new URLSearchParams();
    if (params?.academicYear && params.academicYear !== 'All') query.set('academicYear', params.academicYear);
    if (params?.district && params.district !== 'All') query.set('district', params.district);
    if (params?.search) query.set('search', params.search);

    const response = await fetch(`${API_BASE_URL}/after-al/cutoffs?${query.toString()}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  },

  /**
   * Fetch distinct filter options (academic years and districts)
   */
  async getCutoffFilters(): Promise<CutoffFilterOptions> {
    const response = await fetch(`${API_BASE_URL}/after-al/cutoffs/filters`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      return { academicYears: [], districts: [] };
    }

    return response.json();
  },

  async getEligibleCourses(params?: {
    filter?: EligibleCourseFilter;
    search?: string;
  }): Promise<AfterAlCatalogResponse> {
    const anonId = getAnonymousId();
    const query = new URLSearchParams({ anonymousId: anonId });
    if (params?.filter) query.set('filter', params.filter);
    if (params?.search) query.set('search', params.search);

    const response = await fetch(`${API_BASE_URL}/after-al/eligible-courses?${query.toString()}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || `Failed to load eligible courses (${response.status})`);
    }

    return response.json();
  },

  async getUniversities(params?: {
    filter?: EligibleCourseFilter;
    search?: string;
  }): Promise<AfterAlUniversitiesResponse> {
    const anonId = getAnonymousId();
    const query = new URLSearchParams({ anonymousId: anonId });
    if (params?.filter) query.set('filter', params.filter);
    if (params?.search) query.set('search', params.search);

    const response = await fetch(`${API_BASE_URL}/after-al/universities?${query.toString()}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || `Failed to load universities (${response.status})`);
    }

    return response.json();
  },

  async compareCourses(uniCodes: string[]): Promise<AfterAlCatalogResponse> {
    const anonId = getAnonymousId();
    const response = await fetch(`${API_BASE_URL}/after-al/compare?anonymousId=${encodeURIComponent(anonId)}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ uniCodes }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || `Course comparison failed (${response.status})`);
    }

    return response.json();
  },

  async getCourseDetail(uniCode: string): Promise<AfterAlCatalogResponse> {
    const anonId = getAnonymousId();
    const response = await fetch(
      `${API_BASE_URL}/after-al/courses/${encodeURIComponent(uniCode)}?anonymousId=${encodeURIComponent(anonId)}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || `Failed to load course detail (${response.status})`);
    }

    return response.json();
  },
};
