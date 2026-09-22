import type { FC } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Target, BookOpen, Compass, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AfterOlStartingPointPage: FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const options = [
    {
      id: 'destination',
      icon: Target,
      badge: 'I HAVE A DESTINATION',
      title: 'I know what I want to become',
      description: "I have a career or study goal, but I'm not sure which A/L path can lead me there.",
      actionText: 'Explore my goal',
      path: '/after-ol/goal',
    },
    {
      id: 'interests',
      icon: BookOpen,
      badge: 'I KNOW WHAT ENERGISES ME',
      title: 'I know what I like',
      description: "I enjoy certain subjects or areas, but I'm not sure what I can study at university.",
      actionText: 'Explore my interests',
      path: '/after-ol/interests',
    },
    {
      id: 'discover',
      icon: Compass,
      badge: 'I WANT ROOM TO DISCOVER',
      title: "I'm not sure yet",
      description: "I don't know what I want to become. Help me explore possible paths without pressure.",
      actionText: 'Help me discover',
      path: '/after-ol/discover',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-slate-800 flex flex-col selection:bg-teal-100 selection:text-teal-900 font-sans">
      {/* Top Header */}
      <header className="w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xl font-bold text-slate-900 font-heading tracking-tight flex items-center gap-2">
              <img
                src="/images/after-ol-logo.png"
                alt="PathWise"
                className="w-8 h-8 object-contain"
              />
              <span>PathWise</span>
            </Link>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/70 font-mono text-[11px] font-bold">
              After O/L Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/after-al/results"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#1b497d] transition-colors px-3 py-1.5 rounded-xl hover:bg-slate-100/70"
            >
              <span>Switch to After A/L Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-teal-700 text-white font-semibold text-xs flex items-center justify-center shadow-2xs">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <span className="text-xs font-semibold text-slate-700 hidden md:inline truncate max-w-[120px]">
                  {user?.fullName || 'Student'}
                </span>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-all"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 md:py-20 flex flex-col justify-center">
        {/* Section Header */}
        <div className="mb-10 md:mb-14">
          <div className="text-[12px] font-bold text-[#0D645B] uppercase tracking-[0.14em] mb-3">
            YOUR STARTING POINT
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-[44px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
            What do you already know?
          </h1>
        </div>

        {/* 3 Pathway Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7 items-stretch">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <div
                key={option.id}
                onClick={() => {
                  const mode = option.id === 'destination' ? 'goal' : option.id;
                  localStorage.setItem('pathwise_ol_starting_point', mode);
                  navigate(option.path);
                }}
                className="bg-white rounded-2xl p-8 md:p-9 border border-[#E2E8F0] shadow-xs hover:shadow-xl hover:border-[#0D645B]/40 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  {/* Icon Box */}
                  <div className="w-13 h-13 rounded-2xl bg-[#D6F0EB] text-[#0D645B] flex items-center justify-center mb-8 group-hover:bg-[#0D645B] group-hover:text-white transition-colors duration-200">
                    <Icon className="w-6.5 h-6.5 stroke-[2.2]" />
                  </div>

                  {/* Subtitle Badge */}
                  <div className="text-[11.5px] font-bold text-[#64748B] uppercase tracking-[0.12em] mb-3">
                    {option.badge}
                  </div>

                  {/* Title */}
                  <h2 className="text-[22px] md:text-[24px] font-extrabold text-[#0F172A] mb-3.5 group-hover:text-[#0D645B] transition-colors leading-[1.3]">
                    {option.title}
                  </h2>

                  {/* Description */}
                  <p className="text-[14.5px] text-[#475569] leading-relaxed font-normal">
                    {option.description}
                  </p>
                </div>

                {/* Bottom Action Link */}
                <div className="pt-8 mt-6 flex items-center gap-1.5 text-[15px] font-bold text-[#0D645B] group-hover:text-[#0A4E46] transition-colors">
                  <span>{option.actionText}</span>
                  <span className="text-base font-bold transition-transform group-hover:translate-x-1.5">→</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Helper Bar */}
        <div className="mt-14 pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            Not sure which to choose? All pathways let you explore subject combinations and future university requirements.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </main>
    </div>
  );
};

