import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  RotateCcw,
  Save,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { AfterAlLayout } from '../../components/after-al/AfterAlLayout';
import { afterAlApiService, type AlResultResponse } from '../../services/after-al/afterAlApiService';
import { useStudentEligibility } from '../../hooks/useStudentEligibility';
import { SRI_LANKA_DISTRICTS } from '../../constants/districts';
import { SRI_LANKA_AL_STREAMS, STREAM_SUBJECTS_MAP, ALL_AL_SUBJECTS } from '../../constants/streams';
import { ACADEMIC_YEAR_OPTIONS } from '../../constants/academicYears';
import { InputField } from '../../components/InputField';
import { SelectField } from '../../components/SelectField';

export const MyAlResultsPage: FC = () => {
  const navigate = useNavigate();
  const { refresh } = useStudentEligibility();

  const [stream, setStream] = useState('');
  const [examYear, setExamYear] = useState('2025/26');
  const [district, setDistrict] = useState('');

  // Dynamic Subjects & Grades State
  const [subject1, setSubject1] = useState('');
  const [subject1Grade, setSubject1Grade] = useState('');

  const [subject2, setSubject2] = useState('');
  const [subject2Grade, setSubject2Grade] = useState('');

  const [subject3, setSubject3] = useState('');
  const [subject3Grade, setSubject3Grade] = useState('');

  const [englishGrade, setEnglishGrade] = useState(''); // General English
  const [cgtMarks, setCgtMarks] = useState(''); // Common General Test marks (0-100)
  const [zScore, setZScore] = useState('');

  // G.C.E (O/L) Prerequisites State
  const [olEnglish, setOlEnglish] = useState('');
  const [olMathematics, setOlMathematics] = useState('');
  const [olScience, setOlScience] = useState('');
  const [olLanguage, setOlLanguage] = useState(''); // Sinhala / Tamil Language

  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedResultData, setSavedResultData] = useState<AlResultResponse | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);

  const streams = SRI_LANKA_AL_STREAMS;
  const streamSubjectsMap = STREAM_SUBJECTS_MAP;
  const allSubjects = ALL_AL_SUBJECTS;
  const districts = SRI_LANKA_DISTRICTS;
  const gradeOptions = ['A', 'B', 'C', 'S', 'F'];

  const currentSubjects = stream ? (streamSubjectsMap[stream] || []) : allSubjects;

  // Filter out subjects already selected in other slots
  const availableSubjects1 = currentSubjects.filter((s) => s === subject1 || (s !== subject2 && s !== subject3));
  const availableSubjects2 = currentSubjects.filter((s) => s === subject2 || (s !== subject1 && s !== subject3));
  const availableSubjects3 = currentSubjects.filter((s) => s === subject3 || (s !== subject1 && s !== subject2));

  // Load existing results on mount
  useEffect(() => {
    const fetchExistingResults = async () => {
      setIsLoadingExisting(true);
      try {
        const data = await afterAlApiService.getLatestResults();
        if (data) {
          setSavedResultData(data);
          if (data.stream) setStream(data.stream);
          if (data.examYear) setExamYear(data.examYear);
          if (data.district) setDistrict(data.district);

          if (data.subject1) setSubject1(data.subject1);
          if (data.subject1Grade) setSubject1Grade(data.subject1Grade);

          if (data.subject2) setSubject2(data.subject2);
          if (data.subject2Grade) setSubject2Grade(data.subject2Grade);

          if (data.subject3) setSubject3(data.subject3);
          if (data.subject3Grade) setSubject3Grade(data.subject3Grade);

          if (data.englishGrade) setEnglishGrade(data.englishGrade);
          if (data.cgtMarks !== undefined && data.cgtMarks !== null) setCgtMarks(String(data.cgtMarks));
          if (data.zScore !== undefined && data.zScore !== null) setZScore(String(data.zScore));

          if (data.olEnglish) setOlEnglish(data.olEnglish);
          if (data.olMathematics) setOlMathematics(data.olMathematics);
          if (data.olScience) setOlScience(data.olScience);
          if (data.olLanguage) setOlLanguage(data.olLanguage);

          if (data.updatedAt) {
            setLastUpdatedTime(new Date(data.updatedAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }));
          }
        }
      } catch (err) {
        console.warn('Could not load existing A/L results:', err);
      } finally {
        setIsLoadingExisting(false);
      }
    };

    fetchExistingResults();
  }, []);

  const handleStreamChange = (newStream: string) => {
    setStream(newStream);
    setSubject1('');
    setSubject2('');
    setSubject3('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    // Validation
    if (!stream) {
      setErrorMessage('Please select your A/L stream.');
      return;
    }
    if (!district) {
      setErrorMessage('Please select your examination district.');
      return;
    }
    if (!subject1 || !subject1Grade || !subject2 || !subject2Grade || !subject3 || !subject3Grade) {
      setErrorMessage('Please select all 3 A/L subjects and their respective grades.');
      return;
    }
    const parsedZScore = parseFloat(zScore);
    if (isNaN(parsedZScore)) {
      setErrorMessage('Please provide a valid Z-Score (e.g. 1.7453).');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        stream,
        examYear,
        district,
        subject1,
        subject1Grade,
        subject2,
        subject2Grade,
        subject3,
        subject3Grade,
        englishGrade: englishGrade || undefined,
        cgtMarks: cgtMarks ? parseInt(cgtMarks, 10) : undefined,
        zScore: parsedZScore,
        olEnglish: olEnglish || undefined,
        olMathematics: olMathematics || undefined,
        olScience: olScience || undefined,
        olLanguage: olLanguage || undefined,
      };

      const res = await afterAlApiService.saveResults(payload);
      setSavedResultData(res);
      setSaveSuccess(true);
      setLastUpdatedTime('Just now');
      await refresh();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save results. Please check your backend connection.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AfterAlLayout
      title="My A/L Results"
      subtitle="These results are used by the eligibility engine to check every course automatically."
    >
      <div className="space-y-6">
        {/* Error Toast */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="font-semibold">{errorMessage}</p>
          </div>
        )}

        {/* Success Toast / Eligibility Banner */}
        {saveSuccess && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 shadow-sm text-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-950 text-base">Results Saved & Synchronized!</h4>
                <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                  Your university admission eligibility has been automatically evaluated based on official UGC cutoff marks.
                  {savedResultData?.eligibilitySummary && (
                    <span className="font-semibold text-emerald-700 block mt-1">
                      {savedResultData.eligibilitySummary.ineligibilityReason ? (
                        <span className="text-amber-800">{savedResultData.eligibilitySummary.ineligibilityReason}</span>
                      ) : (
                        <>
                          Matched {savedResultData.eligibilitySummary.totalEligibleUniCodes ?? savedResultData.eligibilitySummary.totalEligibleCourses ?? 0} courses
                          ({savedResultData.eligibilitySummary.highChanceCount ?? 0} High,{' '}
                          {savedResultData.eligibilitySummary.targetChanceCount ?? savedResultData.eligibilitySummary.moderateChanceCount ?? 0} Target,{' '}
                          {savedResultData.eligibilitySummary.reachChanceCount ?? 0} Reach)
                          {savedResultData.eligibilitySummary.academicYear && (
                            <> using {savedResultData.eligibilitySummary.academicYear} cutoffs</>
                          )}
                          .
                        </>
                      )}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/after-al/eligibility')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              <span>View Eligible Courses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Results Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-6"
        >
          {/* Row 1: Stream, Exam Year & District */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <SelectField
              label="A/L Stream *"
              value={stream}
              onChange={(e) => handleStreamChange(e.target.value)}
            >
              {!stream && <option value="" disabled hidden>— Select stream —</option>}
              {streams.map((s) => (
                <option key={s} value={s} className="text-slate-900">
                  {s}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Examination year *"
              value={examYear}
              onChange={(e) => setExamYear(e.target.value)}
              options={ACADEMIC_YEAR_OPTIONS}
            />

            <SelectField
              label="District *"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              {!district && <option value="" disabled hidden>— Select district —</option>}
              {districts.map((d) => (
                <option key={d} value={d} className="text-slate-900">
                  {d}
                </option>
              ))}
            </SelectField>
          </div>

          {/* Section: SUBJECTS */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Subjects & Grades
              </h3>
              <span className="text-xs text-slate-400 font-medium">Select your 3 A/L subjects and grades</span>
            </div>

            <div className="space-y-4">
              {/* Subject 1 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 items-start">
                <div className="md:col-span-8">
                  <SelectField
                    label="Subject 1 *"
                    value={subject1}
                    onChange={(e) => setSubject1(e.target.value)}
                  >
                    {!subject1 && <option value="" disabled hidden>— Select subject 1 —</option>}
                    {availableSubjects1.map((s) => (
                      <option key={s} value={s} className="text-slate-900">{s}</option>
                    ))}
                  </SelectField>
                </div>
                <div className="md:col-span-4">
                  <SelectField
                    label="Grade *"
                    value={subject1Grade}
                    onChange={(e) => setSubject1Grade(e.target.value)}
                  >
                    {!subject1Grade && <option value="" disabled hidden>— Select grade —</option>}
                    {gradeOptions.map((g) => (
                      <option key={g} value={g} className="text-slate-900 font-bold">{g}</option>
                    ))}
                  </SelectField>
                </div>
              </div>

              {/* Subject 2 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 items-start">
                <div className="md:col-span-8">
                  <SelectField
                    label="Subject 2 *"
                    value={subject2}
                    onChange={(e) => setSubject2(e.target.value)}
                  >
                    {!subject2 && <option value="" disabled hidden>— Select subject 2 —</option>}
                    {availableSubjects2.map((s) => (
                      <option key={s} value={s} className="text-slate-900">{s}</option>
                    ))}
                  </SelectField>
                </div>
                <div className="md:col-span-4">
                  <SelectField
                    label="Grade *"
                    value={subject2Grade}
                    onChange={(e) => setSubject2Grade(e.target.value)}
                  >
                    {!subject2Grade && <option value="" disabled hidden>— Select grade —</option>}
                    {gradeOptions.map((g) => (
                      <option key={g} value={g} className="text-slate-900 font-bold">{g}</option>
                    ))}
                  </SelectField>
                </div>
              </div>

              {/* Subject 3 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 items-start">
                <div className="md:col-span-8">
                  <SelectField
                    label="Subject 3 *"
                    value={subject3}
                    onChange={(e) => setSubject3(e.target.value)}
                  >
                    {!subject3 && <option value="" disabled hidden>— Select subject 3 —</option>}
                    {availableSubjects3.map((s) => (
                      <option key={s} value={s} className="text-slate-900">{s}</option>
                    ))}
                  </SelectField>
                </div>
                <div className="md:col-span-4">
                  <SelectField
                    label="Grade *"
                    value={subject3Grade}
                    onChange={(e) => setSubject3Grade(e.target.value)}
                  >
                    {!subject3Grade && <option value="" disabled hidden>— Select grade —</option>}
                    {gradeOptions.map((g) => (
                      <option key={g} value={g} className="text-slate-900 font-bold">{g}</option>
                    ))}
                  </SelectField>
                </div>
              </div>
            </div>

            {/* General English & Common General Test & Z-Score */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5">
              <SelectField
                label="General English (optional)"
                value={englishGrade}
                onChange={(e) => setEnglishGrade(e.target.value)}
              >
                {!englishGrade && <option value="" disabled hidden>— Select grade —</option>}
                {gradeOptions.map((g) => (
                  <option key={g} value={g} className="text-slate-900">{g}</option>
                ))}
                <option value="Not Taken" className="text-slate-900">Not Taken</option>
              </SelectField>

              <InputField
                label="Common General Test"
                type="number"
                min={0}
                max={100}
                value={cgtMarks}
                onChange={(e) => setCgtMarks(e.target.value)}
                placeholder="e.g. 65"
              />

              <InputField
                label="Z-score *"
                type="number"
                step="0.0001"
                value={zScore}
                onChange={(e) => setZScore(e.target.value)}
                placeholder="e.g. 1.7453"
                required
              />
            </div>
          </div>

          {/* Section: G.C.E (O/L) PREREQUISITES */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                G.C.E (O/L) Requirements
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <SelectField
                label="English"
                value={olEnglish}
                onChange={(e) => setOlEnglish(e.target.value)}
              >
                {!olEnglish && <option value="" disabled hidden>— Select grade —</option>}
                {gradeOptions.map((g) => (
                  <option key={g} value={g} className="text-slate-900">{g}</option>
                ))}
              </SelectField>

              <SelectField
                label="Mathematics"
                value={olMathematics}
                onChange={(e) => setOlMathematics(e.target.value)}
              >
                {!olMathematics && <option value="" disabled hidden>— Select grade —</option>}
                {gradeOptions.map((g) => (
                  <option key={g} value={g} className="text-slate-900">{g}</option>
                ))}
              </SelectField>

              <SelectField
                label="Science"
                value={olScience}
                onChange={(e) => setOlScience(e.target.value)}
              >
                {!olScience && <option value="" disabled hidden>— Select grade —</option>}
                {gradeOptions.map((g) => (
                  <option key={g} value={g} className="text-slate-900">{g}</option>
                ))}
              </SelectField>

              <SelectField
                label="Language"
                value={olLanguage}
                onChange={(e) => setOlLanguage(e.target.value)}
              >
                {!olLanguage && <option value="" disabled hidden>— Select grade —</option>}
                {gradeOptions.map((g) => (
                  <option key={g} value={g} className="text-slate-900">{g}</option>
                ))}
              </SelectField>
            </div>
          </div>

          {/* Last Updated Timestamp */}
          {lastUpdatedTime && (
            <div className="text-xs text-slate-400 font-medium">
              Last updated: {lastUpdatedTime}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving || isLoadingExisting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-70 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              {isSaving ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Saving & Updating Eligibility...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save results</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AfterAlLayout>
  );
};
