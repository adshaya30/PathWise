import type { FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Target, Compass, BookOpen, GraduationCap, Landmark, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AfterOlLayout } from '../../components/after-ol/AfterOlLayout';
import { useAuth } from '../../context/AuthContext';

export const AfterOlDashboardPage: FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <AfterOlLayout
      title="O/L Pathways Dashboard"
      subtitle="Map your career goals to A/L streams, subjects, and Sri Lankan state university degrees."
    >
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0D645B] via-[#0F766E] to-[#115E59] p-8 md:p-10 text-white shadow-md">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-4 text-teal-100">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Exploration Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-3 font-heading">
              Welcome{user?.fullName ? `, ${user.fullName}` : ''}! Plan your A/L Journey.
            </h1>
            <p className="text-teal-100/90 text-sm md:text-base leading-relaxed mb-6 max-w-2xl">
              Discover which A/L streams (Physical Science, Biological Science, Commerce, Technology, Arts) unlock your dream career without guessing.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/after-ol/goal')}
                className="px-5 py-2.5 bg-white text-[#0D645B] font-bold text-xs rounded-xl shadow-xs hover:bg-teal-50 transition-all cursor-pointer flex items-center gap-2"
              >
                <Target className="w-4 h-4" />
                <span>Select / Change Career Goal</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/after-ol/pathways')}
                className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-semibold text-xs rounded-xl backdrop-blur-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Compass className="w-4 h-4" />
                <span>View A/L Streams</span>
              </button>
            </div>
          </div>
        </div>

        {/* Explore Path Stages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Goal */}
          <Link
            to="/after-ol/goal"
            className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#0D645B]/50 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-[#D6F0EB] text-[#0D645B] flex items-center justify-center mb-4 group-hover:bg-[#0D645B] group-hover:text-white transition-colors">
                <Target className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#0D645B] transition-colors">
                Career Goal
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose or update your desired career (Doctor, Engineer, Software Engineer, Architect, etc.).
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0D645B]">
              <span>Explore Goal</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: A/L Stream */}
          <Link
            to="/after-ol/pathways"
            className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#0D645B]/50 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-[#D6F0EB] text-[#0D645B] flex items-center justify-center mb-4 group-hover:bg-[#0D645B] group-hover:text-white transition-colors">
                <Compass className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#0D645B] transition-colors">
                A/L Streams
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                See all recognized A/L stream routes that lead toward your destination.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0D645B]">
              <span>View Stream Routes</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Subjects */}
          <Link
            to="/after-ol/subjects"
            className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#0D645B]/50 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-[#D6F0EB] text-[#0D645B] flex items-center justify-center mb-4 group-hover:bg-[#0D645B] group-hover:text-white transition-colors">
                <BookOpen className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#0D645B] transition-colors">
                Subject Combinations
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Check mandatory 3-subject rules, baskets, and prerequisite requirements.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0D645B]">
              <span>Explore Subjects</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Courses */}
          <Link
            to="/after-ol/study-options"
            className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#0D645B]/50 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-[#D6F0EB] text-[#0D645B] flex items-center justify-center mb-4 group-hover:bg-[#0D645B] group-hover:text-white transition-colors">
                <GraduationCap className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#0D645B] transition-colors">
                Courses & Degrees
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Compare UGC state degrees, diplomas, TVEC vocational NVQ paths, and professional qualifications.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0D645B]">
              <span>Compare Courses</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 5: Universities */}
          <Link
            to="/after-ol/universities"
            className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#0D645B]/50 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-[#D6F0EB] text-[#0D645B] flex items-center justify-center mb-4 group-hover:bg-[#0D645B] group-hover:text-white transition-colors">
                <Landmark className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#0D645B] transition-colors">
                Universities
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Explore faculties and state universities offering courses matching your stream.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0D645B]">
              <span>Explore Campuses</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 6: AI Assistant */}
          <Link
            to="/after-ol/ai"
            className="bg-gradient-to-br from-teal-50 to-white rounded-2xl p-6 border border-teal-200/80 shadow-2xs hover:shadow-md hover:border-[#0D645B] transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-[#0D645B] text-white flex items-center justify-center mb-4 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#0D645B] transition-colors">
                PathWise AI Advisor
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ask questions about subject combinations, O/L minimum requirements, and career possibilities.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-teal-100 flex items-center justify-between text-xs font-bold text-[#0D645B]">
              <span>Ask AI Advisor</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Quick Tips Section */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#0D645B]" />
            <span>Sri Lankan O/L & A/L Selection Principles</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">1. Keep Prerequisites In Mind</span>
              Certain degrees (e.g. Medicine, Engineering, Architecture) require specific high school subjects like Combined Maths, Chemistry, Physics, or Biology.
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">2. 3-Subject Rule</span>
              For state university eligibility in Sri Lanka, you must sit for 3 approved subjects within recognized stream baskets.
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">3. Alternate Study Pathways</span>
              If state university cutoffs are high, recognized HND, NVQ, and BIT external degrees provide direct entry points.
            </div>
          </div>
        </div>
      </div>
    </AfterOlLayout>
  );
};
