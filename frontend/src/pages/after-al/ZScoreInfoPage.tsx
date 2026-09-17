import { useState, useEffect, useMemo, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Loader2, BookOpen, Building2, TrendingUp, ArrowRight } from 'lucide-react';
import { AfterAlLayout } from '../../components/after-al/AfterAlLayout';
import { afterAlApiService, type CutoffItem } from '../../services/after-al/afterAlApiService';
import { useStudentEligibility } from '../../hooks/useStudentEligibility';
import { InputField } from '../../components/InputField';
import { SelectField } from '../../components/SelectField';
import { Pagination } from '../../components/Pagination';
import { formatUniversityName, formatDegreeName } from '../../constants/universities';

const ITEMS_PER_PAGE = 10;

export const ZScoreInfoPage: FC = () => {
  const { result: userResult, courses: userCourses, hasResult, isLoading: profileLoading } = useStudentEligibility();
  const navigate = useNavigate();
  const [cutoffs, setCutoffs] = useState<CutoffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fetch initial filters and cutoff data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const filtersRes = await afterAlApiService.getCutoffFilters().catch(() => ({ academicYears: [], districts: [] }));

        if (filtersRes.academicYears && filtersRes.academicYears.length > 0) {
          const validYears = filtersRes.academicYears.filter((y) => y && !y.includes('---') && !y.startsWith(':'));
          setAvailableYears(validYears);
        } else {
          setAvailableYears(['2026/27', '2025/26', '2024/25', '2023/24']);
        }
      } catch (err) {
        console.error('Error loading cutoff filters:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Fetch cutoffs for the student's own district when the profile is ready
  useEffect(() => {
    if (!hasResult || !userResult?.district) {
      return;
    }

    const fetchFiltered = async () => {
      setLoading(true);
      try {
        const data = await afterAlApiService.getCutoffMarks({
          academicYear: selectedYear !== 'All' ? selectedYear : undefined,
          district: userResult.district,
          search: searchQuery.trim() || undefined,
        });
        setCutoffs(data);
      } catch (err) {
        console.error('Error fetching filtered cutoffs:', err);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchFiltered, 250);
    return () => clearTimeout(timeout);
  }, [hasResult, userResult, selectedYear, searchQuery]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, searchQuery]);

  // Normalize a string for fuzzy course/degree/uni name matching
  const normalize = (s?: string | null): string => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Keep only rows that belong to the student's result: same district + one of their matched courses
  const filteredCutoffs = useMemo(() => {
    return (
      cutoffs
        .filter((item) => {
          // Filter out corrupted / OCR separator rows
          if (!item.degree || item.degree.includes('---') || item.degree.startsWith(':') || item.degree.length < 2) {
            return false;
          }
          if (item.university && (item.university.includes('---') || item.university.startsWith(':'))) {
            return false;
          }
          if (item.district && (item.district.includes('---') || item.district.startsWith(':'))) {
            return false;
          }

          // Filter out non-Z-Score values (e.g. intake seat quotas like 5, 8, 10 from Table 2/3)
          if (item.zScore !== null && item.zScore !== undefined) {
            const zNum = Number(item.zScore);
            if (zNum > 3.0 || zNum < -1.0) {
              return false;
            }
          }

          // Only the student's own district (matches the fetched district filter)
          if (userResult?.district && item.district && normalize(item.district) !== normalize(userResult.district)) {
            return false;
          }

          // Only courses/university that relate to the student's evaluated results
          const degree = normalize(item.degree);
          const uni = normalize(item.university);
          const matchesUserCourse =
            userCourses.length === 0 ||
            userCourses.some((c) => {
              const cName = normalize(c.courseName);
              const cUni = normalize(c.university);
              return (
                (degree.length > 0 && (degree.includes(cName) || cName.includes(degree))) &&
                (uni.length > 0 && (uni.includes(cUni) || cUni.includes(uni)))
              );
            });
          if (!matchesUserCourse) {
            return false;
          }

          // Search Match
          const matchesSearch =
            !searchQuery ||
            (item.degree && item.degree.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.university && item.university.toLowerCase().includes(searchQuery.toLowerCase()));

          // Year Match
          const matchesYear = selectedYear === 'All' || item.academicYear === selectedYear;

          return matchesSearch && matchesYear;
        })
        .sort((a, b) => {
          const aVal = a.zScore !== null && a.zScore !== undefined ? Number(a.zScore) : -Infinity;
          const bVal = b.zScore !== null && b.zScore !== undefined ? Number(b.zScore) : -Infinity;
          return bVal - aVal;
        })
    );
  }, [cutoffs, userResult, userCourses, searchQuery, selectedYear]);

  const totalPages = Math.ceil(filteredCutoffs.length / ITEMS_PER_PAGE) || 1;

  // Sliced data for pagination
  const paginatedCutoffs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCutoffs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCutoffs, currentPage]);

  const yearOptions = [
    { label: 'All Years', value: 'All' },
    ...(availableYears.length > 0
      ? availableYears.map((y) => ({ label: y, value: y }))
      : [
          { label: '2025/26', value: '2025/26' },
          { label: '2024/25', value: '2024/25' },
        ]),
  ];

  const busy = profileLoading || (hasResult && loading);

  return (
    <AfterAlLayout title="Z-Score Info">
      <div className="space-y-4">
        {busy ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Loading published Z-scores from database...</p>
          </div>
        ) : !hasResult ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-10 md:p-14 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                Enter Your A/L Results to View Z-Score Info
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Please enter your A/L stream, district, and Z-Score in the{' '}
                <strong className="text-slate-700">My A/L Results</strong> page. We'll then show only the
                published cutoff Z-scores for the courses and universities matching your results.
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
            {/* Filter Controls Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                {/* Search Input using InputField Component */}
                <div className="flex-1 min-w-[220px]">
                  <InputField
                    icon={<Search className="w-4 h-4 text-slate-400" />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search degree or university..."
                    className="bg-slate-50 border-slate-200 py-2 text-sm rounded-xl"
                  />
                </div>

                {/* Academic Year Filter with Label */}
                <div className="flex items-center gap-2 min-w-[160px]">
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Year:</span>
                  <div className="flex-1">
                    <SelectField
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      options={yearOptions}
                      className="bg-slate-50 border-slate-200 py-2 text-sm rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Showing <span className="text-blue-600 font-bold">{filteredCutoffs.length}</span> records
              </div>
            </div>

            {/* Z-Score Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {filteredCutoffs.length === 0 ? (
                <div className="py-16 text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">No Matching Z-Score Records</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    No published cutoff Z-scores found for the courses matching your results in your district.
                    Try selecting "All Years" or widening your search.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="py-3.5 px-6">Academic Year</th>
                          <th className="py-3.5 px-6">Degree</th>
                          <th className="py-3.5 px-6">University</th>
                          <th className="py-3.5 px-6 text-right">Z-Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {paginatedCutoffs.map((row, idx) => {
                          const zVal = row.zScore !== null && row.zScore !== undefined ? Number(row.zScore) : null;
                          const fullUniName = formatUniversityName(row.university, row.degree);
                          const cleanDegree = formatDegreeName(row.degree);

                          return (
                            <tr
                              key={row.id || `${row.academicYear}-${row.degree}-${row.university}-${idx}`}
                            >
                              {/* Academic Year */}
                              <td className="py-4 px-6 font-medium text-slate-600 whitespace-nowrap text-xs">
                                {row.academicYear || '2025/26'}
                              </td>

                              {/* Degree */}
                              <td className="py-4 px-6 font-semibold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0 hidden sm:block" />
                                  <span>{cleanDegree}</span>
                                </div>
                              </td>

                              {/* University */}
                              <td className="py-4 px-6 text-slate-700 font-medium">
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 hidden sm:block" />
                                  <span>{fullUniName}</span>
                                </div>
                              </td>

                              {/* Z-Score */}
                              <td className="py-4 px-6 text-right font-bold text-blue-600 font-mono text-base whitespace-nowrap">
                                {zVal !== null ? zVal.toFixed(4) : 'NQC'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Reusable Pagination */}
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredCutoffs.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </AfterAlLayout>
  );
};
