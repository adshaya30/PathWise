import { authApiService } from '../authApiService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const REQUEST_TIMEOUT_MS = 10000;

export interface SavedCourse {
  uniCode: string;
  savedAt: string;
}

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

const fetchWithTimeout = (url: string, options: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export const savedCoursesApiService = {
  async getSavedCourses(): Promise<SavedCourse[]> {
    const anonId = getAnonymousId();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/saved-courses?anonymousId=${encodeURIComponent(anonId)}`,
      { method: 'GET', headers: getHeaders() }
    );

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as SavedCourse[];
  },

  async addSavedCourse(uniCode: string): Promise<SavedCourse> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/saved-courses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ uniCode, anonymousId: getAnonymousId() }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || `Failed to save course (${response.status})`);
    }

    return (await response.json()) as SavedCourse;
  },

  async removeSavedCourse(uniCode: string): Promise<void> {
    const anonId = getAnonymousId();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/saved-courses/${encodeURIComponent(uniCode)}?anonymousId=${encodeURIComponent(anonId)}`,
      { method: 'DELETE', headers: getHeaders() }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || `Failed to remove saved course (${response.status})`);
    }
  },

  async mergeAnonymousToUser(): Promise<number> {
    const anonId = getAnonymousId();
    const response = await fetchWithTimeout(`${API_BASE_URL}/saved-courses/merge`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ anonymousId: anonId }),
    });

    if (!response.ok) {
      return 0;
    }

    const data = (await response.json()) as { merged?: number };
    return data.merged ?? 0;
  },
};