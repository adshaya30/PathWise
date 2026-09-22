import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Target, CheckCircle2 } from 'lucide-react';
import { AfterOlLayout } from '../../components/after-ol/AfterOlLayout';

interface StreamPathway {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  typicalSubjects: string[];
  keyDegrees: string[];
}

interface GoalPathwayData {
  title: string;
  streams: StreamPathway[];
}

const CAREER_PATHWAYS_DATABASE: Record<string, GoalPathwayData> = {
  'software-engineer': {
    title: 'Software Engineer',
    streams: [
      {
        id: 'physical-science',
        name: 'Physical Science',
        badge: 'POSSIBLE PATHWAY',
        tagline: 'A structured subject pathway to explore',
        description: 'Standard route leading directly to Computer Science (UOC), Software Engineering (UOM/UOK/UOR), and Engineering faculties.',
        typicalSubjects: ['Combined Mathematics', 'Physics', 'Chemistry or ICT'],
        keyDegrees: ['BSc (Hons) in Software Engineering', 'BSc in Computer Science', 'BSc Eng (Hons) Computer Engineering'],
      },
      {
        id: 'technology',
        name: 'Technology',
        badge: 'POSSIBLE PATHWAY',
        tagline: 'A structured subject pathway to explore',
        description: 'Direct route into Bachelor of Information and Communication Technology (BICT) and Software Technology programs across state universities.',
        typicalSubjects: ['Engineering Technology', 'Science for Technology', 'Information & Communication Technology (ICT)'],
        keyDegrees: ['Bachelor of Information & Communication Technology (BICT)', 'Bachelor of Technology (BTech) in Software Tech'],
      },
    ],
  },
  'doctor': {
    title: 'Doctor',
    streams: [
      {
        id: 'biological-science',
        name: 'Biological Science',
        badge: 'POSSIBLE PATHWAY',
        tagline: 'A structured subject pathway to explore',
        description: 'The mandatory official route for MBBS / BDS admission across all 11 state Medical faculties in Sri Lanka.',
        typicalSubjects: ['Biology', 'Chemistry', 'Physics or Agricultural Science'],
        keyDegrees: ['Bachelor of Medicine and Bachelor of Surgery (MBBS)', 'Bachelor of Dental Surgery (BDS)'],
      },
    ],
  },
  'engineer': {
    title: 'Engineer',
    streams: [
      {
        id: 'physical-science',
        name: 'Physical Science',
        badge: 'POSSIBLE PATHWAY',
        tagline: 'A structured subject pathway to explore',
        description: 'The primary prerequisite stream for BSc Engineering (Civil, Electrical, Mechanical, Chemical, Mechatronics) at Moratuwa, Peradeniya, Ruhuna, and Jaffna.',
        typicalSubjects: ['Combined Mathematics', 'Physics', 'Chemistry'],
        keyDegrees: ['BSc Engineering (Hons) - Civil / Electrical / Mechanical / Electronic'],
      },
      {
        id: 'technology',
        name: 'Technology',
        badge: 'POSSIBLE PATHWAY',
        tagline: 'A structured subject pathway to explore',
        description: 'Vocational and professional Engineering Technology degrees (BET) focusing on practical industrial implementation.',
        typicalSubjects: ['Engineering Technology', 'Science for Technology', 'ICT / Secondary Subject'],
        keyDegrees: ['Bachelor of Engineering Technology (BET Hons)'],
      },
    ],
  },
  'accountant': {
    title: 'Accountant',
    streams: [
      {
        id: 'commerce',
        name: 'Commerce',
        badge: 'POSSIBLE PATHWAY',
        tagline: 'A structured subject pathway to explore',
        description: 'Direct entry into Accounting, Finance, and Business Administration faculties at USJ, UOC, UOK, and UOR.',
        typicalSubjects: ['Accounting', 'Business Studies', 'Economics or Business Statistics / ICT'],
        keyDegrees: ['B.Com (Special)', 'BSc in Accounting', 'BSc in Finance', 'CA Sri Lanka / CIMA'],
      },
    ],
  },
  'architect': {
    title: 'Architect',
    streams: [
      {
        id: 'physical-science',
        name: 'Physical Science',
        badge: 'POSSIBLE PATHWAY',
        tagline: 'A structured subject pathway to explore',
        description: 'Prepares for Bachelor of Architecture (B.Arch) at University of Moratuwa with aptitude testing.',
        typicalSubjects: ['Combined Mathematics', 'Physics', 'Chemistry or Art'],
        keyDegrees: ['Bachelor of Architecture (B.Arch - Moratuwa)', 'BSc in Built Environment'],
      },
      {
        id: 'arts',
        name: 'Arts / Multi-Disciplinary',
        badge: 'POSSIBLE PATHWAY',
        tagline: 'A structured subject pathway to explore',
        description: 'Certain architecture & design streams accept approved combinations with an Art & Design prerequisite.',
        typicalSubjects: ['Art', 'Geography / Mathematics', 'Approved 3rd Subject'],
        keyDegrees: ['Bachelor of Landscape Architecture', 'BSc in Design (Moratuwa)'],
      },
    ],
  },
  'lawyer': {
    title: 'Lawyer',
    streams: [
      {
        id: 'arts',
        name: 'Arts',
        badge: 'POSSIBLE PATHWAY',
        tagline: 'A structured subject pathway to explore',
        description: 'Most common stream for Bachelor of Laws (LLB) at University of Colombo, Open University, and Sri Lanka Law College.',
        typicalSubjects: ['Logic & Scientific Method', 'Political Science', 'Economics / Languages'],
        keyDegrees: ['Bachelor of Laws (LL.B - UOC)', 'Attorney-at-Law (Law College)'],
      },
      {
        id: 'commerce',
        name: 'Commerce / Physical Science',
        badge: 'POSSIBLE PATHWAY',
        tagline: 'A structured subject pathway to explore',
        description: 'Sri Lankan state law admissions also allocate seats for Commerce and Science stream students via general quota.',
        typicalSubjects: ['3 Approved A/L Subjects in recognized stream'],
        keyDegrees: ['Bachelor of Laws (LL.B)', 'Corporate Law Specialization'],
      },
    ],
  },
  'data-scientist': {
    title: 'Data Scientist',
    streams: [
      {
        id: 'physical-science',
        name: 'Physical Science',
        badge: 'POSSIBLE PATHWAY',
        tagline: 'A structured subject pathway to explore',
        description: 'Strong mathematical and statistical foundation for Data Science degrees at Moratuwa, Colombo, and Kelaniya.',
        typicalSubjects: ['Combined Mathematics', 'Physics', 'Information & Communication Technology (ICT)'],
        keyDegrees: ['BSc (Hons) in Data Science', 'BSc in Statistics & Computer Science'],
      },
      {
        id: 'technology',
        name: 'Technology',
        badge: 'POSSIBLE PATHWAY',
        tagline: 'A structured subject pathway to explore',
        description: 'Applied computing and data analytics pathways through Technology faculties.',
        typicalSubjects: ['Engineering Technology', 'Science for Technology', 'ICT'],
        keyDegrees: ['BICT in Data Analytics & Applied Computing'],
      },
    ],
  },
};

export const AlPathExplorerPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const goalKey = searchParams.get('goal');
  const discoverKey = searchParams.get('discover');
  const interestsKey = searchParams.get('interests');

  const goalData = useMemo(() => {
    if (discoverKey) {
      const selected = discoverKey.split(',');
      const streams: StreamPathway[] = [];

      if (selected.some((s) => ['technology', 'solving-problems', 'creating-things', 'how-things-work'].includes(s))) {
        streams.push({
          id: 'technology',
          name: 'Technology Stream',
          badge: 'RECOMMENDED PATHWAY',
          tagline: 'Hands-on practical science and computing',
          description: 'A direct pathway into Information Technology, Software Engineering, and Engineering Technology degrees.',
          typicalSubjects: ['Engineering Technology', 'Science for Technology', 'ICT'],
          keyDegrees: ['Bachelor of Information & Communication Technology (BICT)', 'BTech in Software Technology'],
        });
      }

      if (selected.some((s) => ['solving-problems', 'numbers', 'how-things-work'].includes(s))) {
        streams.push({
          id: 'physical-science',
          name: 'Physical Science (Maths)',
          badge: 'RECOMMENDED PATHWAY',
          tagline: 'Deep problem-solving and analytical thinking',
          description: 'Opens state university doors to Engineering, Computer Science, Data Science, and Physical Science programs.',
          typicalSubjects: ['Combined Mathematics', 'Physics', 'Chemistry or ICT'],
          keyDegrees: ['BSc (Hons) in Software Engineering', 'BSc in Computer Science', 'BSc Engineering'],
        });
      }

      if (selected.some((s) => ['languages', 'creating-things', 'business-leadership'].includes(s))) {
        streams.push({
          id: 'arts',
          name: 'Arts & Humanities',
          badge: 'RECOMMENDED PATHWAY',
          tagline: 'Language, culture, communication & design',
          description: 'Unlocks diverse university programs in Languages, International Relations, Law, Media, and Visual Arts.',
          typicalSubjects: ['English / Sinhala / Tamil', 'Media Studies', 'Political Science or Geography'],
          keyDegrees: ['Bachelor of Arts (BA)', 'Bachelor of Laws (LL.B)', 'BA in Mass Communication'],
        });
      }

      if (selected.some((s) => ['numbers', 'business-leadership'].includes(s))) {
        streams.push({
          id: 'commerce',
          name: 'Commerce Stream',
          badge: 'RECOMMENDED PATHWAY',
          tagline: 'Finance, enterprise, accounting & strategy',
          description: 'Gateway to Business Administration, Finance, Accounting, and International Business degrees.',
          typicalSubjects: ['Accounting', 'Business Studies', 'Economics or ICT'],
          keyDegrees: ['BBA / BCom in Accounting & Finance', 'BSc in Management'],
        });
      }

      if (selected.some((s) => ['helping-people'].includes(s))) {
        streams.push({
          id: 'biological-science',
          name: 'Biological Science',
          badge: 'RECOMMENDED PATHWAY',
          tagline: 'Life sciences, health, medicine & biology',
          description: 'The primary stream for Medicine, Nursing, Pharmacy, and Agricultural Science admissions.',
          typicalSubjects: ['Biology', 'Chemistry', 'Physics or Agricultural Science'],
          keyDegrees: ['MBBS / BDS', 'BSc Nursing / Allied Health Sciences', 'BSc in Biotechnology'],
        });
      }

      if (streams.length === 0) {
        streams.push({
          id: 'physical-science',
          name: 'Physical Science',
          badge: 'POSSIBLE PATHWAY',
          tagline: 'Analytical foundation',
          description: 'A flexible pathway keeping many university doors open.',
          typicalSubjects: ['Combined Mathematics', 'Physics', 'Chemistry or ICT'],
          keyDegrees: ['BSc in Science & Computing'],
        });
      }

      return {
        title: 'Your Discovered Strengths',
        streams,
      };
    }

    if (interestsKey) {
      return {
        title: 'Your Subject Interests',
        streams: [
          {
            id: 'physical-science',
            name: 'Physical Science',
            badge: 'MATCHING INTERESTS',
            tagline: 'Built on your chosen subjects',
            description: 'Explores analytical thinking, mathematics, physics, and science streams.',
            typicalSubjects: ['Combined Mathematics', 'Physics', 'Chemistry or ICT'],
            keyDegrees: ['BSc in Computer Science', 'BSc in Engineering'],
          },
          {
            id: 'technology',
            name: 'Technology',
            badge: 'MATCHING INTERESTS',
            tagline: 'Applied science & digital technology',
            description: 'Practical technology-focused combinations.',
            typicalSubjects: ['Engineering Technology', 'Science for Technology', 'ICT'],
            keyDegrees: ['BICT in Information Technology', 'BTech'],
          },
        ],
      };
    }

    const key = goalKey || 'software-engineer';
    return (
      CAREER_PATHWAYS_DATABASE[key.toLowerCase()] || {
        title: key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        streams: [
          {
            id: 'physical-science',
            name: 'Physical Science',
            badge: 'POSSIBLE PATHWAY',
            tagline: 'A structured subject pathway to explore',
            description: 'Explore mathematics, physics, and science streams for this career ambition.',
            typicalSubjects: ['Combined Mathematics', 'Physics', 'Chemistry / ICT'],
            keyDegrees: ['BSc / Specialized Bachelor Degree'],
          },
          {
            id: 'technology',
            name: 'Technology',
            badge: 'POSSIBLE PATHWAY',
            tagline: 'A structured subject pathway to explore',
            description: 'Vocational and technological subject combinations.',
            typicalSubjects: ['Engineering Technology', 'Science for Technology', 'ICT'],
            keyDegrees: ['Bachelor of Technology / BICT'],
          },
        ],
      }
    );
  }, [goalKey, discoverKey, interestsKey]);

  const [selectedStreamId, setSelectedStreamId] = useState<string>(
    goalData.streams[0]?.id || 'physical-science'
  );

  const handleStreamClick = (streamId: string) => {
    setSelectedStreamId(streamId);
  };

  const handleContinueToSubjects = (streamId: string) => {
    const params = new URLSearchParams();
    params.set('stream', streamId);
    if (goalKey) params.set('goal', goalKey);
    if (discoverKey) params.set('discover', discoverKey);
    if (interestsKey) params.set('interests', interestsKey);
    navigate(`/after-ol/subjects?${params.toString()}`);
  };

  return (
    <AfterOlLayout
      title={`Paths toward ${goalData.title}`}
      subtitle="Explore the A/L streams available for this pathway and compare subject requirements."
    >
      <div className="space-y-8">
        {/* Header Section */}
        <div>
          <div className="text-[12px] font-bold text-[#0D645B] uppercase tracking-[0.14em] mb-2 font-mono">
            POSSIBLE PATHWAYS
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight leading-tight mb-3 font-heading">
            Paths toward {goalData.title}
          </h1>
          <p className="text-sm md:text-base text-[#475569] leading-relaxed max-w-2xl font-normal">
            These are relevant pathways to explore based on your choices. They are possibilities, not fixed recommendations.
          </p>
        </div>

        {/* Stream Pathway Cards (Horizontal Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {goalData.streams.map((stream) => {
            const isSelected = selectedStreamId === stream.id;

            return (
              <div
                key={stream.id}
                onClick={() => handleStreamClick(stream.id)}
                className={`bg-white rounded-2xl p-7 md:p-8 border transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-lg group ${
                  isSelected
                    ? 'border-[#0D645B] ring-1 ring-[#0D645B]/20'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-bold text-[#0D645B] uppercase tracking-[0.12em] font-mono">
                      {stream.badge}
                    </span>
                    <ChevronRight
                      className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${
                        isSelected ? 'text-[#0D645B]' : 'text-slate-400'
                      }`}
                    />
                  </div>

                  <h2 className="text-2xl font-bold text-[#0F172A] mb-2 group-hover:text-[#0D645B] transition-colors font-heading">
                    {stream.name}
                  </h2>

                  <p className="text-xs md:text-sm text-slate-500 font-normal leading-relaxed mb-6">
                    {stream.tagline}
                  </p>

                  <div className="pt-4 border-t border-slate-100 space-y-3 text-xs text-slate-600">
                    <div>
                      <span className="font-bold text-slate-700 block mb-1">Standard A/L Subjects:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {stream.typicalSubjects.map((subj, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium text-[11.5px]"
                          >
                            {subj}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContinueToSubjects(stream.id);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D645B] group-hover:text-[#0A4E46] transition-colors cursor-pointer"
                  >
                    <span>View Subject Combinations</span>
                    <span>→</span>
                  </button>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0D645B] bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Selected</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Change Goal Helper Bar */}
        <div className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-medium">Selected goal:</span>
            <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
              {goalData.title}
            </span>
          </div>
          <Link
            to="/after-ol/goal"
            className="inline-flex items-center gap-1.5 font-bold text-[#0D645B] hover:text-[#0A4E46] transition-colors"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Choose a different career goal</span>
          </Link>
        </div>
      </div>
    </AfterOlLayout>
  );
};
