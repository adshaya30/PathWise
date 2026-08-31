import { useState, type FC } from 'react';
import { Bell, ChevronDown, Menu, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface AdminHeaderProps {
  onMenuClick?: () => void;
  title?: string;
  subtitle?: string;
}

export const AdminHeader: FC<AdminHeaderProps> = ({
  onMenuClick,
  title = 'Documents',
  subtitle = 'Upload, review, and verify knowledge-base source documents.',
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const emailDisplay = user?.email || '2003adshaya@gmail.com';
  const initials = emailDisplay.substring(0, 2).toUpperCase();

  return (
    <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      {/* Title & Mobile Toggle */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Controls: Notifications & Profile */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-3 z-30 animate-in fade-in-50">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900">Notifications</span>
              </div>
              <div className="p-6 text-center text-xs text-slate-400">
                No new notifications
              </div>
            </div>
          )}
        </div>

        {/* User Badge / Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm">
              {initials}
            </div>
            <span className="text-sm font-medium text-slate-800 hidden sm:inline-block">
              {emailDisplay.split('@')[0]}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">Admin Account</p>
                <p className="text-[11px] text-slate-400 truncate">{emailDisplay}</p>
              </div>
              <div className="px-4 py-2 text-[11px] text-emerald-600 font-medium bg-emerald-50/50 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Verified Administrator
              </div>
              <div className="border-t border-slate-100 mt-1">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
