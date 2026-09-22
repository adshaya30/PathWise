import type { FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Target, BookOpen, Compass, Sparkles } from 'lucide-react';

export const AfterOlPathwayDetailPage: FC = () => {
  const { pathway } = useParams<{ pathway: string }>();

  const pathwayConfig: Record<
    string,
    { title: string; subtitle: string; icon: typeof Target; desc: string }
  > = {
    goal: {
      title: 'I know what I want to become',
      subtitle: 'I HAVE A DESTINATION',
      icon: Target,
      desc: 'Connect your career ambitions with the required A/L streams, prerequisite subjects, and Sri Lankan state university entrance criteria.',
    },
    interests: {
      title: 'I know what I like',
      subtitle: 'I KNOW WHAT ENERGISES ME',
      icon: BookOpen,
      desc: 'Explore which A/L subject combinations match the subjects you enjoy studying and see what degrees they open doors to.',
    },
    discover: {
      title: "I'm not sure yet",
      subtitle: 'I WANT ROOM TO DISCOVER',
      icon: Compass,
      desc: 'Take an interest assessment and discover broad pathway combinations that keep your future options open without pressure.',
    },
  };

  const current = pathway ? pathwayConfig[pathway] || pathwayConfig.goal : pathwayConfig.goal;
  const Icon = current.icon;

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/after-ol" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-teal-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Starting Point</span>
          </Link>
          <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/70 font-mono text-[11px] font-bold">
            After O/L Explorer
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 flex flex-col justify-center items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#D6F0EB] text-[#0D645B] flex items-center justify-center mb-6 shadow-xs">
          <Icon className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div className="text-[12px] font-bold text-[#0D645B] uppercase tracking-[0.14em] mb-2 font-mono">
          {current.subtitle}
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] mb-4 font-heading tracking-tight">
          {current.title}
        </h1>

        <p className="text-slate-600 max-w-xl text-base leading-relaxed mb-8">
          {current.desc}
        </p>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 max-w-lg w-full shadow-xs text-left mb-8">
          <div className="flex items-center gap-2.5 text-teal-800 font-bold text-sm mb-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>Module Under Assembly</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            The Subject-to-Stream mapping matrix and interactive A/L combination selector for this pathway are being assembled.
          </p>
        </div>

        <Link
          to="/after-ol"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#0D645B] hover:bg-[#0A4E46] text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Choose Another Starting Point</span>
        </Link>
      </main>
    </div>
  );
};
