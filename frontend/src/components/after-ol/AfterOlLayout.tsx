import type { FC, ReactNode } from 'react';
import { DashboardLayout } from '../common/DashboardLayout';
import { afterOlNavSections } from '../../config/navigationConfigs';

interface AfterOlLayoutProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  showAiChat?: boolean;
  children?: ReactNode;
}

export const AfterOlLayout: FC<AfterOlLayoutProps> = ({
  title = 'After O/L Dashboard',
  subtitle,
  showSearch = false,
  searchPlaceholder,
  onSearchChange,
  showAiChat = true,
  children,
}) => {
  return (
    <DashboardLayout
      brandTitle="PathWise"
      portalBadge="After O/L Portal"
      badgeBgColor="text-[#0D645B]"
      themeColor="teal"
      sections={afterOlNavSections}
      showUserProfile={true}
      userStream="O/L Pathways"
      userYear="2026"
      title={title}
      subtitle={subtitle}
      showSearch={showSearch}
      searchPlaceholder={searchPlaceholder}
      onSearchChange={onSearchChange}
      showAiChat={showAiChat}
    >
      {children}
    </DashboardLayout>
  );
};
