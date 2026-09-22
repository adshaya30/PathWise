import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="w-full border-b border-gray-200 bg-bg-main/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center">
          <Link to="/" className="text-xl font-bold text-text-main font-heading">
            PathWise
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <a 
            href="#cutoff-explorer"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('cutoff-explorer');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.location.href = '/#cutoff-explorer';
              }
            }}
            className="text-sm font-bold text-[#1b497d] hover:text-[#153860] transition-colors"
          >
            UGC Cut-Off Marks Explorer
          </a>
          <a
            href="#journey"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('journey');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.location.href = '/#journey';
              }
            }}
            className="text-sm font-medium text-secondary hover:text-text-main transition-colors"
          >
            Your journey
          </a>
          <Link to="/after-al/ai" className="text-sm font-medium text-secondary hover:text-text-main transition-colors">
            PathWise AI
          </Link>
        </nav>

        {/* Right: Actions (Always Log in and Get started) */}
        <div className="flex items-center gap-3">
          <Link 
            to="/login"
            className="px-4 py-2 text-sm font-semibold text-text-main bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
          >
            Log in
          </Link>
          <Link 
            to="/register"
            className="px-4 py-2 text-sm font-semibold text-white bg-deep-blue rounded-md hover:bg-[#153860] transition-colors shadow-sm"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
