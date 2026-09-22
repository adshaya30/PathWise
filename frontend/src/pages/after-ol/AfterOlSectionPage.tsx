import type { FC } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Compass, BookOpen, GraduationCap, Landmark, Bookmark, ArrowLeft } from 'lucide-react';
import { AfterOlLayout } from '../../components/after-ol/AfterOlLayout';

export const AfterOlSectionPage: FC = () => {
  const location = useLocation();
  const path = location.pathname;

  let title = 'Explore Pathway';
  let subtitle = 'Explore pathways, subjects, and study choices for After O/L.';
  let Icon = Compass;
  let description = 'This After O/L section is currently being updated with verified syllabus and university criteria.';

  if (path.includes('/pathways')) {
    title = 'A/L Path Explorer';
    subtitle = 'Discover all recognized A/L stream routes and their prerequisite requirements.';
    Icon = Compass;
    description = 'Explore how Physical Science, Biological Science, Commerce, Technology, and Arts streams connect to your future degree options.';
  } else if (path.includes('/subjects')) {
    title = 'Subject Combinations';
    subtitle = 'Analyze allowed subject baskets and 3-subject combinations for Sri Lankan A/Ls.';
    Icon = BookOpen;
    description = 'Check prerequisite rules, common combinations, and ensure your 3 A/L subjects satisfy state university admission criteria.';
  } else if (path.includes('/study-options')) {
    title = 'Study Options & Degree Pathways';
    subtitle = 'Compare state universities, external degrees, SLIATE HNDs, and NVQ pathways.';
    Icon = GraduationCap;
    description = 'Understand the differences between UGC state degree quotas, vocational qualifications, and external degree programs.';
  } else if (path.includes('/universities')) {
    title = 'University Explorer (O/L)';
    subtitle = 'Explore Sri Lankan state universities and their affiliated faculties.';
    Icon = Landmark;
    description = 'View faculties of Medicine, Engineering, Computing, Management, and Applied Sciences across 17+ state universities.';
  } else if (path.includes('/saved')) {
    title = 'Saved Courses & Pathways';
    subtitle = 'Review your bookmarked career goals and university degrees.';
    Icon = Bookmark;
    description = 'Your bookmarked pathways and university degree programs will appear here for easy comparison.';
  }

  return (
    <AfterOlLayout title={title} subtitle={subtitle}>
      <div className="bg-white rounded-3xl p-10 md:p-14 border border-slate-200/90 shadow-2xs text-center max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-[#D6F0EB] text-[#0D645B] flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Icon className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div className="inline-block text-[11px] font-bold text-[#0D645B] uppercase tracking-wider font-mono mb-2">
          After O/L Module
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-3 font-heading">
          {title}
        </h2>

        <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto mb-8">
          {description}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/after-ol/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D645B] hover:bg-[#0A4E46] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>
          <Link
            to="/after-ol/goal"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <span>Change Career Goal</span>
          </Link>
        </div>
      </div>
    </AfterOlLayout>
  );
};
