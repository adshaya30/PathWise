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
import { savedCoursesApiService, type SavedCourse } from '../services/saved-courses/savedCoursesApiService';
import { authApiService } from '../services/authApiService';

const LOCAL_STORAGE_KEY = 'pathwise_saved_courses';

interface SavedCoursesContextValue {
  savedCodes: string[];
  savedCourses: SavedCourse[];
  savedCount: number;
  isLoading: boolean;
  error: string | null;
  isSaved: (uniCode: string) => boolean;
  toggle: (uniCode: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const SavedCoursesContext = createContext<SavedCoursesContextValue | null>(null);

const loadLocal = (): string[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((code) => typeof code === 'string') : [];
  } catch {
    return [];
  }
};

const saveLocal = (codes: string[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(codes));
  } catch {
    // ignore quota / privacy-mode failures
  }
};

const isLoggedIn = (): boolean => Boolean(authApiService.getAccessToken());

export const SavedCoursesProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [savedCodes, setSavedCodes] = useState<string[]>(loadLocal);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const localCodes = loadLocal();

    try {
      if (isLoggedIn() && localCodes.length > 0) {
        try {
          await savedCoursesApiService.mergeAnonymousToUser();
        } catch {
          // merge is best-effort; continue to server fetch
        }
      }

      const serverCourses = await savedCoursesApiService.getSavedCourses();
      const serverCodes = serverCourses.map((c) => c.uniCode);

      // Union merge so locally-saved courses are never wiped by a failed/absent server sync.
      const merged = mergeUnique(serverCodes, localCodes);

      setSavedCodes(merged);
      saveLocal(merged);
    } catch (loadError) {
      console.error('Failed to load saved courses:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load saved courses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const isSaved = useCallback((uniCode: string) => savedCodes.includes(uniCode), [savedCodes]);

  const toggle = useCallback(
    async (uniCode: string) => {
      const wasSaved = savedCodes.includes(uniCode);
      const next = wasSaved
        ? savedCodes.filter((code) => code !== uniCode)
        : [...savedCodes, uniCode];

      // Optimistic update — applied immediately and persisted locally so the
      // button always responds. Not reverted on failure (server sync is re-run
      // on the next refresh / merge).
      setSavedCodes(next);
      saveLocal(next);

      try {
        if (wasSaved) {
          await savedCoursesApiService.removeSavedCourse(uniCode);
        } else {
          await savedCoursesApiService.addSavedCourse(uniCode);
        }
        setError(null);
      } catch (toggleError) {
        console.error('Failed to toggle saved course:', toggleError);
        setError(toggleError instanceof Error ? toggleError.message : 'Failed to update saved course');
      }
    },
    [savedCodes]
  );

  const value = useMemo(
    () => ({
      savedCodes,
      savedCourses: savedCodes.map((uniCode) => ({
        uniCode,
        savedAt: new Date().toISOString(),
      })),
      savedCount: savedCodes.length,
      isLoading,
      error,
      isSaved,
      toggle,
      refresh,
    }),
    [savedCodes, isLoading, error, isSaved, toggle, refresh]
  );

  return <SavedCoursesContext.Provider value={value}>{children}</SavedCoursesContext.Provider>;
};

function mergeUnique(left: string[], right: string[]): string[] {
  const seen = new Set<string>(left);
  for (const code of right) {
    if (!seen.has(code)) {
      left.push(code);
      seen.add(code);
    }
  }
  return left;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSavedCourses(): SavedCoursesContextValue {
  const context = useContext(SavedCoursesContext);
  if (!context) {
    throw new Error('useSavedCourses must be used within a SavedCoursesProvider');
  }
  return context;
}