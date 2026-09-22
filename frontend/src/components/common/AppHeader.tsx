import { useState, useRef, useEffect, type FC, type ReactNode } from 'react';
import { Bell, Menu, LogOut, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export interface AppHeaderProps {
  onMenuClick?: () => void;
  title?: string;
  subtitle?: string;
  portalBadge?: string;
  themeColor?: 'blue' | 'teal';
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  academicCycle?: string;
  actions?: ReactNode;
}

export const AppHeader: FC<AppHeaderProps> = ({
  onMenuClick,
  title = 'Dashboard',
  subtitle,
  portalBadge: _portalBadge,
  themeColor = 'blue',
  showSearch = false,
  searchPlaceholder = 'Search degrees, universities, subjects...',
  onSearchChange,
  academicCycle,
  actions,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const userDisplayName = user?.fullName || 'Nimal Perera';
  const emailDisplay = user?.email || 'user@pathwise.lk';
  const initials = userDisplayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'NP';

  return (
    <header className="bg-white border-b border-slate-200/80 px-6 md:px-8 h-[74px] flex items-center justify-between sticky top-0 z-20 gap-6 flex-shrink-0">
      {/* Title & Mobile Toggle */}
      <div className="flex items-center gap-3.5 min-w-[200px]">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 truncate font-heading">{title}</h1>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 truncate hidden sm:block mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Optional Center Search Bar */}
      {showSearch && (
        <div className="flex-1 max-w-2xl hidden sm:block">
          <div className="relative">
            <Search className="w-4.5 h-4.5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
            />
          </div>
        </div>
      )}

      {/* Right Actions, Badge, Notifications & User Menu */}
      <div className="flex items-center gap-3">
        {academicCycle && (
          <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80">
            {academicCycle}
          </span>
        )}

        {actions}

        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-30 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase">Alerts</span>
                <span className="text-[10px] bg-[#e8edf4] text-[#1b497d] px-1.5 py-0.5 rounded-full font-bold">New Cutoffs</span>
              </div>
              <div className="py-3 text-xs text-slate-600">
                <div className="font-semibold text-slate-800">UGC Cutoffs 2026 Updated</div>
                <div className="text-slate-400 mt-0.5">Physical Science and Engineering cutoffs are now available.</div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 cursor-pointer focus:outline-none"
            aria-label="User profile"
          >
            <div
              className={`w-9 h-9 rounded-full ${
                themeColor === 'teal'
                  ? 'bg-[#0D645B] shadow-[#0D645B]/25'
                  : 'bg-[#1b497d] shadow-[#1b497d]/20'
              } text-white font-bold text-xs flex items-center justify-center shadow-md`}
            >
              {initials}
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{userDisplayName}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate">{emailDisplay}</p>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
