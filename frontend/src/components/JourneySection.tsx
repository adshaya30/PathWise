import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export function JourneySection() {
  return (
    <section id="journey" className="w-full max-w-5xl mx-auto px-6 py-24 flex flex-col items-center">
      <div className="text-center mb-16">
        <p className="text-deep-blue font-semibold tracking-widest uppercase text-sm mb-4 font-mono">Two Journeys</p>
        <h2 className="text-4xl md:text-5xl font-extrabold text-text-main max-w-2xl mx-auto leading-tight">
          Wherever you are, PathWise meets you there
        </h2>
      </div>

      <div className="w-full flex flex-col gap-12">
        {/* Card 1: After O/L */}
        <div className="w-full bg-white border border-gray-100 rounded-[2rem] p-8 md:p-12 shadow-sm flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 flex flex-col items-start text-left">
            <span className="inline-block px-3 py-1 bg-blue-50 text-deep-blue font-bold text-xs rounded-md mb-6 uppercase tracking-wider">After O/L</span>
            <h3 className="text-3xl font-extrabold text-text-main mb-6 leading-tight">
              "I don't know which A/L subjects to choose."
            </h3>
            <div className="border-l-2 border-gray-200 pl-4 mb-8">
              <p className="text-secondary italic leading-relaxed text-lg">
                Explore streams and subjects, take an interest & strength assessment, and see where each combination may lead — without being told what to become.
              </p>
            </div>
            <ul className="space-y-4 mb-10 w-full">
              <li className="flex items-center gap-3 text-text-main font-medium">
                <div className="bg-blue-100 p-1 rounded-full"><Check size={14} className="text-deep-blue stroke-[3]" /></div> 
                Interest & strength assessment
              </li>
              <li className="flex items-center gap-3 text-text-main font-medium">
                <div className="bg-blue-100 p-1 rounded-full"><Check size={14} className="text-deep-blue stroke-[3]" /></div> 
                A/L stream & subject explorer
              </li>
              <li className="flex items-center gap-3 text-text-main font-medium">
                <div className="bg-blue-100 p-1 rounded-full"><Check size={14} className="text-deep-blue stroke-[3]" /></div> 
                Combination & future pathway explorer
              </li>
            </ul>
            <Link to="/after-ol" className="px-6 py-3 bg-deep-blue hover:bg-[#153860] text-white font-semibold rounded-xl shadow-md shadow-deep-blue/20 transition-all active:scale-95">
              Start exploring subjects
            </Link>
          </div>
          <div className="flex-1 w-full">
            {/* Right side mock graphic */}
            <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-6 shadow-inner w-full max-w-md mx-auto">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                  <span className="font-medium text-text-main">Technology</span>
                  <span className="bg-teal/10 text-teal font-bold text-xs px-2 py-1 rounded-md">86%</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                  <span className="font-medium text-text-main">Mathematics</span>
                  <span className="bg-green-100 text-green-700 font-bold text-xs px-2 py-1 rounded-md">75%</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                  <span className="font-medium text-text-main">Science</span>
                  <span className="bg-amber/10 text-amber font-bold text-xs px-2 py-1 rounded-md">70%</span>
                </div>
                <p className="text-sm text-secondary mt-2">
                  Technology-related fields may be worth exploring based on your responses.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: After A/L */}
        <div className="w-full bg-white border border-gray-100 rounded-[2rem] p-8 md:p-12 shadow-sm flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 flex flex-col items-start text-left">
            <span className="inline-block px-3 py-1 bg-teal/10 text-teal font-bold text-xs rounded-md mb-6 uppercase tracking-wider">After A/L</span>
            <h3 className="text-3xl font-extrabold text-text-main mb-6 leading-tight">
              "I got my results. What can I apply for?"
            </h3>
            <div className="border-l-2 border-gray-200 pl-4 mb-8">
              <p className="text-secondary italic leading-relaxed text-lg">
                Enter your results and Z-score, and PathWise checks them against published UGC requirements — clearly, with a reason and a source for every result.
              </p>
            </div>
            <ul className="space-y-4 mb-10 w-full">
              <li className="flex items-center gap-3 text-text-main font-medium">
                <div className="bg-teal/20 p-1 rounded-full"><Check size={14} className="text-teal stroke-[3]" /></div> 
                Automated eligibility checking
              </li>
              <li className="flex items-center gap-3 text-text-main font-medium">
                <div className="bg-teal/20 p-1 rounded-full"><Check size={14} className="text-teal stroke-[3]" /></div> 
                University & degree explorer
              </li>
              <li className="flex items-center gap-3 text-text-main font-medium">
                <div className="bg-teal/20 p-1 rounded-full"><Check size={14} className="text-teal stroke-[3]" /></div> 
                Compare up to 4 courses side by side
              </li>
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/after-al/results" className="px-6 py-3 bg-teal hover:bg-[#0f766e] text-white font-semibold rounded-xl shadow-md shadow-teal/20 transition-all active:scale-95">
                Check my eligibility (Guest)
              </Link>
              <Link to="/after-al/zscore" className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all active:scale-95 text-sm">
                View Z-Score Cutoffs
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full">
            {/* Right side mock graphic */}
            <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-6 shadow-inner w-full max-w-md mx-auto">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                  <span className="font-medium text-text-main">Computer Science, UOC</span>
                  <span className="bg-teal/10 text-teal font-bold text-xs px-2 py-1 rounded-md">Meets requirements</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                  <span className="font-medium text-text-main">Data Science, UOM</span>
                  <span className="bg-amber/10 text-amber font-bold text-xs px-2 py-1 rounded-md">Needs review</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                  <span className="font-medium text-text-main">Software Eng, SLIIT-Aff.</span>
                  <span className="bg-red-100 text-red-600 font-bold text-xs px-2 py-1 rounded-md">Not eligible</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
