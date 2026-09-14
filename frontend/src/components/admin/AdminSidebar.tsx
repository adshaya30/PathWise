import { type FC } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Layers,
  BookOpen,
  Landmark,
  GraduationCap,
  ClipboardCheck,
  Sliders,
  Users,
  Settings,
  LogOut,
  Compass,
} from 'lucide-react';

interface AdminSidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const AdminSidebar: FC<AdminSidebarProps> = ({ isMobileOpen, onCloseMobile }) => {

  const mainNavItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Documents', path: '/admin/documents', icon: FileText },
    { name: 'A/L Streams', path: '/admin/streams', icon: Layers },
    { name: 'Subjects', path: '/admin/subjects', icon: BookOpen },
    { name: 'Universities', path: '/admin/universities', icon: Landmark },
    { name: 'Courses', path: '/admin/courses', icon: GraduationCap },
    { name: 'Admission Requirements', path: '/admin/admission-requirements', icon: ClipboardCheck },
    { name: 'Sources', path: '/admin/sources', icon: Sliders },
    { name: 'Users', path: '/admin/users', icon: Users },
  ];

  const bottomNavItems = [
    { name: 'Settings', path: '/admin/settings', icon: Settings },
    { name: 'Logout', path: '/login', icon: LogOut },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-slate-700 w-64 select-none border-r border-slate-200">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-[74px] border-b border-slate-200/80 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <div className="text-slate-900 font-bold text-lg tracking-tight flex items-center gap-1.5 font-heading">
            PathWise
          </div>
          <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Admin Portal
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 flex">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
