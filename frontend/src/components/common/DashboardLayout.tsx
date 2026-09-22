import { useState, type FC, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { FloatingChatWidget } from '../chat/FloatingChatWidget';
import type { NavItem, NavSection } from '../../types/navigation';

export interface DashboardLayoutProps {
  brandTitle?: string;
  brandLogo?: string;
  portalBadge?: string;
  badgeBgColor?: string;
  themeColor?: 'blue' | 'teal';
  sections?: NavSection[];
  navItems?: NavItem[];
  bottomNavItems?: NavItem[];
  showUserProfile?: boolean;
  userStream?: string;
  userYear?: string;
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  academicCycle?: string;
  actions?: ReactNode;
  showAiChat?: boolean;
  maxWidthClass?: string;
  children?: ReactNode;
}

export const DashboardLayout: FC<DashboardLayoutProps> = ({
  brandTitle = 'PathWise',
  brandLogo,
  portalBadge = 'Portal',
  badgeBgColor,
  themeColor = 'blue',
  sections,
  navItems,
  bottomNavItems,
  showUserProfile = false,
  userStream,
  userYear,
  title = 'Dashboard',
  subtitle,
  showSearch = false,
  searchPlaceholder,
  onSearchChange,
  academicCycle,
  actions,
  showAiChat = false,
  maxWidthClass,
  children,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden relative">
      {/* Reusable Sidebar */}
      <AppSidebar
        brandTitle={brandTitle}
        brandLogo={brandLogo}
        portalBadge={portalBadge}
        badgeBgColor={badgeBgColor}
        themeColor={themeColor}
        sections={sections}
        navItems={navItems}
        bottomNavItems={bottomNavItems}
        showUserProfile={showUserProfile}
        userStream={userStream}
        userYear={userYear}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AppHeader
          onMenuClick={() => setIsMobileOpen(true)}
          title={title}
          subtitle={subtitle}
          portalBadge={portalBadge}
          themeColor={themeColor}
          showSearch={showSearch}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={onSearchChange}
          academicCycle={academicCycle}
          actions={actions}
        />
        <main className={`flex-1 p-4 md:p-6 w-full mx-auto pb-20 ${maxWidthClass || 'max-w-[1550px]'}`}>
          {children || <Outlet />}
        </main>
      </div>

      {/* Floating AI Assistant Chat Widget (if enabled) */}
      {showAiChat && <FloatingChatWidget themeColor={themeColor} />}
    </div>
  );
};
