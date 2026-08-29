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
        <nav className="hidden md:flex items-center gap-8">
          <Link to="#how-it-works" className="text-sm font-medium text-secondary hover:text-text-main transition-colors">
            How it works
          </Link>
          <Link to="/journey" className="text-sm font-medium text-secondary hover:text-text-main transition-colors">
            Your journey
          </Link>
          <Link to="/ai" className="text-sm font-medium text-secondary hover:text-text-main transition-colors">
            PathWise AI
          </Link>
          <Link to="/sources" className="text-sm font-medium text-secondary hover:text-text-main transition-colors">
            Sources
          </Link>
          <Link to="/admin/documents" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors font-semibold">
            Admin Portal
          </Link>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <Link 
            to="/login"
            className="px-4 py-2 text-sm font-semibold text-text-main bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
          >
            Log in
          </Link>
          <Link 
            to="/register"
            className="px-4 py-2 text-sm font-semibold text-white bg-deep-blue rounded-md hover:bg-[#1d4ed8] transition-colors shadow-sm"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
