import { Header } from '../components/Header';
import { JourneySection } from '../components/JourneySection';
import { AISection } from '../components/AISection';
import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-main relative overflow-hidden flex flex-col">
      <Header />
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-deep-blue/10 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-teal/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 left-1/3 w-[30rem] h-[30rem] bg-amber/10 rounded-full blur-3xl"></div>
      </div>
      
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 flex flex-col relative z-10 py-16 md:py-24">
        
        {/* Hero Section */}
        <section className="text-center w-full max-w-4xl mx-auto flex flex-col items-center mb-24">
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            <span className="block text-text-main mb-2">Choose your path.</span>
            <span className="block text-deep-blue">Know your future.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-secondary leading-relaxed mb-10 max-w-3xl">
            PathWise helps Sri Lankan students explore A/L choices, understand future education pathways, and discover university opportunities — based on verified official information, not guesswork.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-4 mb-4">
            <Link to="/after-ol" className="px-6 py-3.5 bg-deep-blue hover:bg-[#1d4ed8] text-white font-semibold rounded-lg transition-colors shadow-sm text-lg">
              I'm Choosing A/L Subjects
            </Link>
            <Link to="/after-al" className="px-6 py-3.5 bg-transparent border border-teal text-teal hover:bg-teal/5 font-semibold rounded-lg transition-colors text-lg">
              I Received My A/L Results
            </Link>
          </div>
          
          <p className="text-sm text-secondary/80 font-medium">
            No predictions. No guarantees. Just verified information, clearly sourced.
          </p>
        </section>

        {/* How It Works */}
        <section className="w-full max-w-4xl bg-card-bg/50 backdrop-blur-md border border-card-bg/40 p-8 rounded-3xl flex flex-col items-start mb-24">
          <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-6">How it works</h3>
          <div className="flex flex-wrap items-center gap-3 md:gap-4 w-full">
            <div className="px-5 py-2.5 bg-card-bg text-text-main font-semibold rounded-full shadow-sm">Explore</div>
            <div className="text-secondary font-bold">→</div>
            <div className="px-5 py-2.5 bg-card-bg text-text-main font-semibold rounded-full shadow-sm">Understand</div>
            <div className="text-secondary font-bold">→</div>
            <div className="px-5 py-2.5 bg-card-bg text-text-main font-semibold rounded-full shadow-sm">Choose</div>
            <div className="text-secondary font-bold">→</div>
            <div className="px-5 py-2.5 bg-card-bg text-text-main font-semibold rounded-full shadow-sm">Check</div>
            <div className="text-secondary font-bold hidden md:block">→</div>
            <div className="px-6 py-2.5 bg-gradient-to-r from-deep-blue to-teal text-card-bg font-bold rounded-full shadow-md mt-2 md:mt-0">Compare PATHWISE</div>
          </div>
        </section>

        <JourneySection />

        <AISection />
      </main>
    </div>
  );
}
