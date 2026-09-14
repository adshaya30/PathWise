import { useState, useEffect, type FC } from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import type { NavItem, NavSection } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';

export interface AppSidebarProps {
  brandTitle?: string;
  portalBadge?: string;
  badgeBgColor?: string;
  sections?: NavSection[];
  navItems?: NavItem[];
  bottomNavItems?: NavItem[];
  showUserProfile?: boolean;
  userStream?: string;
  userYear?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const defaultBottomNav: NavItem[] = [
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Logout', path: '/login', icon: LogOut },
];

export const AppSidebar: FC<AppSidebarProps> = ({
  brandTitle = 'PathWise',
  portalBadge = 'Portal',
  badgeBgColor = 'text-slate-400',
  sections,
  navItems,
  bottomNavItems = defaultBottomNav,
  showUserProfile = false,
  userStream = 'Physical Science',
  userYear = '2026',
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('pathwise_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pathwise_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const userDisplayName = user?.fullName || 'Nimal Perera';
  const userInitials =
    userDisplayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'NP';

  // Normalize sections
  const effectiveSections: NavSection[] =
    sections && sections.length > 0 ? sections : [{ items: navItems || [] }];

  const renderContent = (collapsed: boolean) => (
    <div
      className={`flex flex-col h-full bg-white text-slate-700 select-none border-r border-slate-200 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`flex items-center h-[74px] border-b border-slate-200/80 flex-shrink-0 transition-all ${
          collapsed ? 'justify-center px-2' : 'justify-between px-5'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-slate-900 font-bold text-lg tracking-tight flex items-center gap-1.5 font-heading truncate">
                {brandTitle}
              </div>
              <div className={`text-[10px] font-bold tracking-wider uppercase truncate ${badgeBgColor}`}>
                {portalBadge}
              </div>
            </div>
          )}
        </div>

        {/* Collapse Toggle Arrow Button (Desktop only) */}
        {!isMobileOpen && (
          <button
            type="button"
            onClick={toggleCollapse}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className={`p-1.5 rounded-xl border border-slate-200/90 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer shadow-2xs ${
              collapsed ? 'hidden group-hover:flex' : ''
            }`}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Mini Toggle Bar if collapsed */}
      {collapsed && !isMobileOpen && (
        <div className="flex justify-center pt-2 pb-1 border-b border-slate-100">
          <button
            type="button"
            onClick={toggleCollapse}
            title="Expand Sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto overflow-x-hidden">
        {effectiveSections.map((sec, secIdx) => (
          <div key={sec.title || secIdx} className="space-y-1">
            {sec.title && (
              collapsed ? (
                <div className="h-px bg-slate-100 my-2 mx-1" />
              ) : (
                <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase truncate">
                  {sec.title}
                </div>
              )
            )}
            {sec.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={onCloseMobile}
                  title={collapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    `group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 ${
                      collapsed
                        ? 'justify-center p-3'
                        : 'justify-between px-3.5 py-2.5'
                    } ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-200/60 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`
                  }
                >
                  <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} min-w-0`}>
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </div>

                  {item.badge !== undefined && (
                    collapsed ? (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center justify-center">
                        {item.badge}
                      </span>
                    )
                  )}

                  {/* Hover Tooltip for Collapsed Mode */}
                  {collapsed && (
                    <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                      {item.name}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Section: User Profile Pill or Bottom Nav */}
      {showUserProfile ? (
        <div className={`border-t border-slate-100 bg-slate-50/50 ${collapsed ? 'p-3 flex justify-center' : 'p-4'}`}>
          <div
            className={`flex items-center ${collapsed ? 'justify-center group relative' : 'gap-3 min-w-0'}`}
            title={collapsed ? `${userDisplayName} (A/L ${userYear} · ${userStream})` : undefined}
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
              {userInitials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {userDisplayName}
                </div>
                <div className="text-[11px] text-slate-500 truncate font-medium">
                  A/L {userYear} · {userStream}
                </div>
              </div>
            )}

            {/* Hover Tooltip for Profile in collapsed mode */}
            {collapsed && (
              <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                <p className="font-bold">{userDisplayName}</p>
                <p className="text-[10px] text-slate-300">A/L {userYear} · {userStream}</p>
              </span>
            )}
          </div>
        </div>
      ) : (
        bottomNavItems &&
        bottomNavItems.length > 0 && (
          <div className={`border-t border-slate-100 space-y-1 ${collapsed ? 'p-2' : 'p-3'}`}>
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={onCloseMobile}
                  title={collapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    `group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 ${
                      collapsed
                        ? 'justify-center p-3'
                        : 'gap-3.5 px-4 py-2.5'
                    } ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}

                  {collapsed && (
                    <span className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                      {item.name}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        )
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        {renderContent(isCollapsed)}
      </aside>

      {/* Mobile Drawer (Always fully expanded for clear mobile touch UX) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-10 animate-in slide-in-from-left duration-200">
            {renderContent(false)}
          </div>
        </div>
      )}
    </>
  );
};
