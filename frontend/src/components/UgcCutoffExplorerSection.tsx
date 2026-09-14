import { useState, useEffect, useMemo, type FC } from 'react';
import { Loader2, Building2, CheckCircle2 } from 'lucide-react';
import { afterAlApiService, type CutoffItem } from '../services/after-al/afterAlApiService';
import { InputField } from './InputField';
import { SelectField } from './SelectField';
import { Pagination } from './Pagination';
import { SRI_LANKA_DISTRICTS } from '../constants/districts';
import { UNIVERSITY_FILTER_OPTIONS, formatUniversityName, formatDegreeName } from '../constants/universities';
import { SRI_LANKA_AL_STREAMS, getStreamForDegree } from '../constants/streams';
import { ACADEMIC_YEAR_OPTIONS } from '../constants/academicYears';

const ITEMS_PER_PAGE = 10;

const DISTRICT_SELECT_OPTIONS = [
  { label: 'Select District', value: '' },
  ...SRI_LANKA_DISTRICTS.map((d) => ({ label: d, value: d })),
];

const STREAM_SELECT_OPTIONS = [
  { label: 'Select A/L Stream', value: '' },
  ...SRI_LANKA_AL_STREAMS.map((s) => ({ label: s, value: s })),
];

export const UgcCutoffExplorerSection: FC = () => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('2025/26');
  const [userZScore, setUserZScore] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [cutoffs, setCutoffs] = useState<CutoffItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const isSelectionComplete = Boolean(selectedDistrict && selectedStream);

  useEffect(() => {
    if (!selectedDistrict || !selectedStream) {
      setCutoffs([]);
      setLoading(false);
      return;
    }

    const fetchCutoffs = async () => {
      setLoading(true);
      try {
        const data = await afterAlApiService.getCutoffMarks({
          district: selectedDistrict,
          academicYear: selectedYear !== 'All' ? selectedYear : undefined,
        });

        setCutoffs(data || []);
      } catch (err) {
        console.error('Error fetching real cutoff marks:', err);
        setCutoffs([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchCutoffs, 250);
    return () => clearTimeout(timer);
  }, [selectedDistrict, selectedStream, selectedYear]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDistrict, selectedStream, selectedUniversity, selectedYear, userZScore]);

  // Filter list locally by stream, uni, district, year and sort descending by Z-score
  const filteredCutoffs = useMemo(() => {
    if (!isSelectionComplete) return [];

    return cutoffs
      .filter((item) => {
        // Filter corrupted/OCR rows
        if (!item.degree || item.degree.includes('---') || item.degree.startsWith(':') || item.degree.length < 2) {
          return false;
        }
        if (item.university && (item.university.includes('---') || item.university.startsWith(':'))) {
          return false;
        }

        // Filter out non-Z-Score values (e.g. intake seat quotas like 5, 8, 10 from Table 2/3)
        if (item.zScore !== null && item.zScore !== undefined) {
          const zNum = Number(item.zScore);
          if (zNum > 3.0 || zNum < -1.0) {
            return false;
          }
        }

        const fullUniName = formatUniversityName(item.university, item.degree);

        const matchesDistrict =
          !selectedDistrict ||
          (item.district && item.district.toLowerCase() === selectedDistrict.toLowerCase());

        const degreeStream = getStreamForDegree(item.degree);
        const matchesStream =
          !selectedStream ||
          degreeStream.toLowerCase() === selectedStream.toLowerCase();

        const matchesUni =
          selectedUniversity === 'All' ||
          fullUniName.toLowerCase().includes(selectedUniversity.toLowerCase());

        const matchesYear =
          selectedYear === 'All' || item.academicYear === selectedYear;

        return matchesDistrict && matchesStream && matchesUni && matchesYear;
      })
      .sort((a, b) => {
        const aVal = a.zScore !== null && a.zScore !== undefined ? Number(a.zScore) : -Infinity;
        const bVal = b.zScore !== null && b.zScore !== undefined ? Number(b.zScore) : -Infinity;
        return bVal - aVal;
      });
  }, [cutoffs, isSelectionComplete, selectedDistrict, selectedStream, selectedUniversity, selectedYear]);

  const totalPages = Math.ceil(filteredCutoffs.length / ITEMS_PER_PAGE) || 1;

  // Sliced items for current page (10 per page)
  const paginatedCutoffs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCutoffs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCutoffs, currentPage]);

  const parsedUserZ = parseFloat(userZScore);
  const hasUserZScore = !isNaN(parsedUserZ) && parsedUserZ > 0;

  return (
    <section id="cutoff-explorer" className="w-full max-w-6xl mx-auto my-16 scroll-mt-24">
      {/* Header Title */}
      <div className="mb-6">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 font-heading tracking-tight">
          UGC Cut-Off Marks Explorer
        </h2>
        <p className="text-base text-slate-600 mt-1 max-w-3xl">
          Search published minimum Z-Score cut-off marks for Sri Lankan state universities by district, stream, university, examination year, or enter your own Z-score to check eligibility.
        </p>
      </div>

      {/* Main Filter Box */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
          {/* District */}
          <SelectField
            label="District *"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            options={DISTRICT_SELECT_OPTIONS}
            className={!selectedDistrict ? 'border-amber-300 bg-amber-50/20' : ''}
          />

          {/* A/L Stream */}
          <SelectField
            label="A/L Stream *"
            value={selectedStream}
            onChange={(e) => setSelectedStream(e.target.value)}
            options={STREAM_SELECT_OPTIONS}
            className={!selectedStream ? 'border-amber-300 bg-amber-50/20' : ''}
          />

          {/* University */}
          <SelectField
            label="University"
            value={selectedUniversity}
            onChange={(e) => setSelectedUniversity(e.target.value)}
            options={UNIVERSITY_FILTER_OPTIONS}
            className="truncate"
          />

          {/* Examination Year */}
          <SelectField
            label="Examination Year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            options={ACADEMIC_YEAR_OPTIONS}
          />

          {/* Z-Score Input */}
          <InputField
            label="Z-Score"
            type="number"
            step="0.0001"
            value={userZScore}
            onChange={(e) => setUserZScore(e.target.value)}
            placeholder="e.g. 1.7453"
            className="bg-blue-50/50 border-blue-200 font-semibold text-blue-900"
          />
        </div>
      </div>

      {/* Info Status Bar */}
      {isSelectionComplete && (
        <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-3 px-2">
          <div className="text-sm font-medium text-slate-700">
            Showing <span className="font-bold text-slate-900">{filteredCutoffs.length}</span> official cut-off marks for{' '}
            <span className="font-bold text-blue-600">{selectedDistrict}</span> district in{' '}
            <span className="font-bold text-slate-900">{selectedStream}</span> stream
            {selectedUniversity !== 'All' ? (
              <> at <span className="font-bold text-slate-900">{selectedUniversity}</span></>
            ) : null}
            .
          </div>
        </div>
      )}

      {/* Results Table & Pagination Card OR Empty Selection Prompt */}
      {!isSelectionComplete ? (
        <div className="mt-6 bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center shadow-2xs">
          <h3 className="text-lg font-bold text-slate-900">
            Select Your District and A/L Stream
          </h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Please select both your <strong>District</strong> and <strong>A/L Stream</strong> above to view relevant state university cut-off marks and verify eligibility.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold">
            <span
              className={`px-3 py-1.5 rounded-full border transition-all ${
                selectedDistrict
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {selectedDistrict ? `✓ District: ${selectedDistrict}` : '1. Choose District'}
            </span>
            <span
              className={`px-3 py-1.5 rounded-full border transition-all ${
                selectedStream
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {selectedStream ? `✓ Stream: ${selectedStream}` : '2. Choose A/L Stream'}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm font-medium">Fetching official UGC cut-off records for {selectedDistrict}...</p>
            </div>
          ) : filteredCutoffs.length === 0 ? (
            <div className="py-16 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Official Cut-off Records Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No official published cutoff records match your selection for {selectedDistrict} in {selectedStream}. Try changing the examination year or university filter.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="py-4 px-6">DEGREE</th>
                      <th className="py-4 px-6">UNIVERSITY</th>
                      <th className="py-4 px-6 text-right">Z-SCORE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {paginatedCutoffs.map((item, idx) => {
                      const zVal = item.zScore !== null && item.zScore !== undefined ? Number(item.zScore) : null;
                      const isEligibleWithUserZ = zVal !== null && hasUserZScore && parsedUserZ >= zVal;
                      const fullUniName = formatUniversityName(item.university, item.degree);
                      const cleanDegree = formatDegreeName(item.degree);

                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          {/* DEGREE */}
                          <td className="py-4 px-6 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{cleanDegree}</span>
                              {hasUserZScore && isEligibleWithUserZ && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Eligible
                                </span>
                              )}
                            </div>
                          </td>

                          {/* UNIVERSITY (Explicit Full Name) */}
                          <td className="py-4 px-6 text-slate-700 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>{fullUniName}</span>
                            </div>
                          </td>

                          {/* Z-SCORE */}
                          <td className="py-4 px-6 text-right font-bold text-blue-600 font-mono text-base whitespace-nowrap">
                            {zVal !== null ? zVal.toFixed(4) : 'NQC'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Component (10 items per page) */}
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
      )}
    </section>
  );
};
