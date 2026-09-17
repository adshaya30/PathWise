import { useState, useEffect, useMemo, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Building2,
  TrendingUp,
  Bookmark,
  Sparkles,
  ArrowRight,
  Calculator,
  Loader2,
  GraduationCap,
  FileText,
  BarChart3,
} from 'lucide-react';
import { AfterAlLayout } from '../../components/after-al/AfterAlLayout';
import { useStudentEligibility } from '../../hooks/useStudentEligibility';
import { useSavedCourses } from '../../hooks/useSavedCourses';
import { afterAlApiService, type CutoffItem } from '../../services/after-al/afterAlApiService';
import { getUniversityCode, UNIVERSITY_LOCATIONS } from '../../utils/eligibilityUtils';
import { formatDegreeName } from '../../constants/universities';

export const AlOverviewPage: FC = () => {
  const navigate = useNavigate();
  const { result, courses, byUniversity, counts, hasResult, studentZ, isLoading } = useStudentEligibility();
  const { savedCodes, savedCount } = useSavedCourses();
  const [districtCutoffs, setDistrictCutoffs] = useState<CutoffItem[]>([]);

  useEffect(() => {
    if (result?.district) {
      afterAlApiService
        .getCutoffMarks({ district: result.district })
        .then((data) => {
          if (Array.isArray(data)) {
            setDistrictCutoffs(data);
          }
        })
        .catch(() => {});
    }
  }, [result?.district]);

  const displayName = result?.userEmail?.split('@')[0] || 'Student';
  const stream = result?.stream || 'Not set';
  const district = result?.district || 'Not set';
  const examYear = result?.examYear || '2025/26';

  const quickStats = hasResult
    ? [
        {
          label: 'Calculated Z-Score',
          value: studentZ.toFixed(4),
          desc: `District: ${district}`,
          icon: Calculator,
          color: 'text-blue-600 bg-blue-50',
        },
        {
          label: 'Eligible Degree Programs',
          value: String(counts.eligible),
          desc: `Based on ${examYear} cutoffs`,
          icon: CheckCircle2,
          color: 'text-emerald-600 bg-emerald-50',
        },
        {
          label: 'Participating Universities',
          value: String(byUniversity.length),
          desc: 'Universities with matched courses',
          icon: Building2,
          color: 'text-purple-600 bg-purple-50',
        },
        {
          label: 'Courses Evaluated',
          value: String(counts.all),
          desc: `${counts.needsReview} need review`,
          icon: Bookmark,
          color: 'text-amber-600 bg-amber-50',
        },
      ]
    : [];

  const getGradeBadgeClass = (grade?: string) => {
    switch (grade?.toUpperCase()) {
      case 'A':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
      case 'B':
        return 'bg-emerald-50/80 text-emerald-600 border border-emerald-200/60';
      case 'C':
        return 'bg-amber-50 text-amber-700 border border-amber-200/80';
      case 'S':
        return 'bg-blue-50 text-blue-700 border border-blue-200/80';
      case 'F':
        return 'bg-rose-50 text-rose-700 border border-rose-200/80';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200/80';
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '2 days ago';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '2 days ago';
      const now = new Date();
      const diffSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
      if (diffSeconds < 60) return 'Just now';
      const diffMins = Math.floor(diffSeconds / 60);
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      const diffWeeks = Math.floor(diffDays / 7);
      if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    } catch {
      return '2 days ago';
    }
  };

  const formatCgt = (marks?: number) => {
    if (marks === undefined || marks === null) return 'B';
    if (typeof marks === 'number') {
      if (marks >= 75) return 'A';
      if (marks >= 65) return 'B';
      if (marks >= 50) return 'C';
      if (marks >= 35) return 'S';
      return 'F';
    }
    return String(marks);
  };

  const subjectsList = useMemo(() => {
    if (!result) return [];
    return [
      result.subject1 ? { name: result.subject1, grade: result.subject1Grade, isOptional: false } : null,
      result.subject2 ? { name: result.subject2, grade: result.subject2Grade, isOptional: false } : null,
      result.subject3 ? { name: result.subject3, grade: result.subject3Grade, isOptional: false } : null,
      result.englishGrade && result.englishGrade !== 'Not Taken'
        ? { name: 'General English', grade: result.englishGrade, isOptional: true }
        : null,
    ].filter(Boolean) as { name: string; grade: string; isOptional: boolean }[];
  }, [result]);

  const topSnapshotCourses = useMemo(() => {
    if (courses && courses.length > 0) {
      const valid = courses.filter((c) => c.cutoff > 0);
      if (valid.length > 0) {
        return [...valid]
          .sort((a, b) => b.cutoff - a.cutoff)
          .slice(0, 3)
          .map((c) => {
            const uniCode = getUniversityCode(c.university);
            return {
              id: c.id,
              degree: formatDegreeName(c.courseName),
              uniCode,
              location: UNIVERSITY_LOCATIONS[uniCode] || result?.district || 'Sri Lanka',
              cutoff: c.cutoff,
            };
          });
      }
    }

    if (districtCutoffs.length > 0) {
      return districtCutoffs
        .filter(
          (c) =>
            c.degree &&
            !c.degree.includes('---') &&
            !c.degree.startsWith(':') &&
            c.zScore !== null &&
            c.zScore !== undefined &&
            Number(c.zScore) <= 3.0 &&
            Number(c.zScore) >= -1.0
        )
        .sort((a, b) => Number(b.zScore) - Number(a.zScore))
        .slice(0, 3)
        .map((c) => {
          const uniCode = getUniversityCode(c.university);
          return {
            id: `cutoff-${c.id}-${c.degree}`,
            degree: formatDegreeName(c.degree),
            uniCode,
            location: UNIVERSITY_LOCATIONS[uniCode] || result?.district || 'Sri Lanka',
            cutoff: Number(c.zScore),
          };
        });
    }

    return [];
  }, [courses, districtCutoffs, result?.district]);

  const savedItems = useMemo(
    () => courses.filter((course) => savedCodes.includes(course.uniCode)),
    [courses, savedCodes]
  );

  const overviewCourses = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    const eligible = courses.filter((c) => c.status === 'Eligible');
    const needsReview = courses.filter((c) => c.status === 'Needs review');
    const notEligible = courses.filter((c) => c.status === 'Not eligible');

    const selected: typeof courses = [];
    if (eligible[0]) selected.push(eligible[0]);
    if (needsReview[0]) selected.push(needsReview[0]);
    if (notEligible[0]) selected.push(notEligible[0]);

    for (const c of courses) {
      if (selected.length >= 3) break;
      if (!selected.some((s) => s.id === c.id)) {
        selected.push(c);
      }
    }

    return selected;
  }, [courses]);

  const compareCourse1 = useMemo(() => {
    return savedItems[0] || courses[0] || null;
  }, [savedItems, courses]);

  const topUniversities = useMemo(() => {
    return byUniversity.slice(0, 3);
  }, [byUniversity]);

  return (
    <AfterAlLayout title="Dashboard" subtitle="Your After A/L overview — matched degrees, universities, and eligibility at a glance.">
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Loading your dashboard...</span>
          </div>
        ) : !hasResult ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-10 md:p-14 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-bold text-slate-900 font-heading">Enter Your A/L Results to Get Started</h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Save your stream, district, subjects, and Z-Score to unlock eligibility insights across all universities.
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
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-lg shadow-blue-600/20">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
                <Sparkles className="w-4 h-4" /> Welcome to After A/L Portal
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mt-2 font-heading">Hello, {displayName}!</h2>
              <p className="text-blue-100 text-sm mt-1 max-w-xl">
                Your A/L {stream} results are registered for {district}. Explore eligible degree programs, analyze cutoff
                trends, and prepare your university application.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/after-al/results')}
                  className="px-4 py-2 bg-white text-blue-700 text-xs font-bold rounded-xl shadow-xs hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  Update A/L Results
                </button>
                <button
                  onClick={() => navigate('/after-al/eligibility')}
                  className="px-4 py-2 bg-blue-500/30 text-white border border-white/20 text-xs font-bold rounded-xl hover:bg-blue-500/40 transition-colors cursor-pointer"
                >
                  View Eligible Courses ({counts.eligible})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-slate-500">{stat.label}</span>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mt-2 font-heading">{stat.value}</div>
                    <p className="text-sm text-slate-400 mt-0.5">{stat.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* A/L Results, Z-Score Snapshot & Saved Courses Cards Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: My A/L Results Card */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg font-heading">My A/L Results</h3>
                  </div>
                  <button
                    onClick={() => navigate('/after-al/results')}
                    className="text-blue-600 text-sm font-semibold hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>

                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50/80 text-blue-600 rounded-full text-xs font-semibold border border-blue-100/80">
                    <span className="w-2 h-2 rounded-full border-2 border-blue-500"></span>
                    <span>{result?.stream || 'Physical Science'} Stream</span>
                  </div>
                </div>

                {/* Subject Grade Rows */}
                <div className="divide-y divide-slate-100">
                  {subjectsList.map((subj, i) => (
                    <div key={i} className="py-3 flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-800">
                        <span>{subj.name}</span>
                        {subj.isOptional && (
                          <span className="text-slate-400 text-xs font-normal ml-2">· optional</span>
                        )}
                      </div>
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${getGradeBadgeClass(
                          subj.grade
                        )}`}
                      >
                        {subj.grade}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Details Footer Row */}
                <div className="pt-3 border-t border-dashed border-slate-200 space-y-1.5">
                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-5 gap-y-1">
                    <div>
                      Year: <strong className="text-slate-900 font-semibold">{result?.examYear || '2026'}</strong>
                    </div>
                    <div>
                      District: <strong className="text-slate-900 font-semibold">{result?.district || 'Colombo'}</strong>
                    </div>
                    <div>
                      Z-score: <strong className="text-slate-900 font-semibold">{studentZ > 0 ? studentZ.toFixed(4) : (result?.zScore ? Number(result.zScore).toFixed(4) : '1.7842')}</strong>
                    </div>
                    <div>
                      CGT: <strong className="text-slate-900 font-semibold">{formatCgt(result?.cgtMarks)}</strong>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    Last updated: {formatTimeAgo(result?.updatedAt || result?.createdAt)}
                  </div>
                </div>
              </div>

              {/* Right Column: Z-Score Snapshot & Saved Courses Cards */}
              <div className="lg:col-span-5 space-y-6">
                {/* Z-Score Snapshot Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
                  <div
                    onClick={() => navigate('/after-al/zscore')}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shadow-2xs">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-base md:text-lg font-heading group-hover:text-blue-600 transition-colors">
                        Z-Score Snapshot
                      </h3>
                    </div>
                    <div className="text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:underline">
                      <span>View all</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {topSnapshotCourses.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {topSnapshotCourses.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => navigate('/after-al/zscore')}
                          className="flex items-center justify-between text-sm group cursor-pointer hover:bg-slate-50/80 p-2 -mx-2 rounded-xl transition-all"
                        >
                          <div className="text-slate-700 font-medium truncate pr-3 group-hover:text-blue-600 transition-colors">
                            <span className="font-semibold">{item.degree}</span>
                            <span className="text-slate-400 mx-1.5">·</span>
                            <span className="text-slate-500 font-medium">{item.uniCode}</span>
                            <span className="text-slate-400 mx-1.5">·</span>
                            <span className="text-slate-500 font-medium">{item.location}</span>
                          </div>
                          <div className="text-blue-600 font-bold font-mono text-sm shrink-0">
                            {item.cutoff.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => navigate('/after-al/zscore')}
                      className="py-4 text-center text-slate-400 text-xs cursor-pointer hover:text-blue-600"
                    >
                      No course cutoff data available. Click to view all Z-Score Info.
                    </div>
                  )}
                </div>

                {/* Saved Courses Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
                  <div
                    onClick={() => navigate('/after-al/saved')}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Bookmark className="w-4 h-4 fill-white text-white" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-base md:text-lg font-heading group-hover:text-blue-600 transition-colors">
                        Saved Courses
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{savedCount} saved</span>
                  </div>

                  {savedItems.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {savedItems.slice(0, 3).map((item) => {
                        const uniCode = getUniversityCode(item.university);
                        return (
                          <div
                            key={item.id}
                            onClick={() => navigate('/after-al/saved')}
                            className="py-3 flex items-start gap-3 hover:bg-slate-50/60 transition-colors rounded-xl px-2 -mx-2 cursor-pointer group"
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              <Bookmark className="w-3.5 h-3.5 fill-white text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                                {item.courseName} <span className="font-normal text-slate-400">—</span> {uniCode}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                <span
                                  className={
                                    item.status === 'Eligible'
                                      ? 'text-emerald-600 font-medium'
                                      : item.status === 'Needs review'
                                      ? 'text-amber-600 font-medium'
                                      : 'text-slate-500'
                                  }
                                >
                                  {item.status}
                                </span>
                                <span className="mx-1.5">·</span>
                                <span>Saved recently</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-400 text-xs space-y-1">
                      <p>No saved courses yet.</p>
                      <button
                        onClick={() => navigate('/after-al/courses')}
                        className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        Browse University Courses
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Eligibility Overview & Compare Courses Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Eligibility Overview Card */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-2xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base md:text-lg font-heading">
                      Eligibility Overview
                    </h3>
                  </div>
                  <button
                    onClick={() => navigate('/after-al/eligibility')}
                    className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>View all {counts.all}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {overviewCourses.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {overviewCourses.map((course) => (
                      <div
                        key={course.id}
                        onClick={() => navigate('/after-al/eligibility')}
                        className="py-3.5 flex items-start justify-between gap-4 group cursor-pointer hover:bg-slate-50/60 p-2 -mx-2 rounded-xl transition-all"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                            style={{
                              backgroundColor:
                                course.status === 'Eligible'
                                  ? '#16A34A'
                                  : course.status === 'Needs review'
                                  ? '#EAB308'
                                  : '#DC2626',
                            }}
                          />
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-semibold text-slate-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                              {course.courseName} <span className="font-normal text-slate-400">—</span>{' '}
                              {course.university}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-1">
                              {course.explanation}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 text-[11px] font-bold px-3 py-1 rounded-full border ${
                            course.status === 'Eligible'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                              : course.status === 'Needs review'
                              ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                              : 'bg-rose-50 text-rose-700 border-rose-200/80'
                          }`}
                        >
                          {course.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No evaluated courses found.
                  </div>
                )}
              </div>

              {/* Compare Courses Card */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base md:text-lg font-heading">
                    Compare Courses
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Slot 1: Active Course */}
                  <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-1">
                    <div className="font-semibold text-slate-900 text-xs truncate">
                      {compareCourse1?.courseName || 'Computer Science'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {compareCourse1?.university || 'University of Colombo'}
                    </div>
                  </div>

                  {/* Slot 2: Add a Course */}
                  <div
                    onClick={() => navigate('/after-al/compare')}
                    className="p-3 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer bg-slate-50/30"
                  >
                    <span>+ Add a course</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      compareCourse1 ? `/after-al/compare?courses=${compareCourse1.uniCode}` : '/after-al/compare'
                    )
                  }
                  className="w-full py-2.5 bg-white border border-slate-200 hover:border-blue-400 text-slate-800 font-bold rounded-xl text-xs shadow-2xs hover:bg-blue-50/40 transition-all cursor-pointer"
                >
                  Compare now
                </button>
              </div>
            </div>

            {/* Row 3: University Courses Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base md:text-lg font-heading">
                    University Courses
                  </h3>
                </div>
                <button
                  onClick={() => navigate('/after-al/courses')}
                  className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Explore all</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {topUniversities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {topUniversities.map((uni) => (
                    <div
                      key={uni.id}
                      onClick={() => navigate('/after-al/courses')}
                      className="p-5 bg-slate-50/60 hover:bg-blue-50/40 border border-slate-200/80 hover:border-blue-200 rounded-2xl text-center space-y-2 cursor-pointer transition-all group"
                    >
                      <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold font-mono">
                        {uni.code}
                      </div>
                      <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                        {uni.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {uni.eligibleCount} eligible course{uni.eligibleCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No university course data available.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AfterAlLayout>
  );
};
