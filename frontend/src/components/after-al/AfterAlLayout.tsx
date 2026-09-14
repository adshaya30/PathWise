import { useMemo, type FC, type ReactNode } from 'react';
import { DashboardLayout } from '../common/DashboardLayout';
import { afterAlNavSections } from '../../config/navigationConfigs';
import { useStudentEligibility } from '../../context/StudentEligibilityContext';
import type { NavSection } from '../../types/navigation';

interface AfterAlLayoutProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  showAiChat?: boolean;
  children?: ReactNode;
}

export const AfterAlLayout: FC<AfterAlLayoutProps> = ({
  title = 'My A/L Results',
  subtitle,
  showSearch = false,
  searchPlaceholder,
  onSearchChange,
  showAiChat = true,
  children,
}) => {
  const { result, counts, hasResult } = useStudentEligibility();

  const sections: NavSection[] = useMemo(() => {
    const eligibleBadge = hasResult && counts.eligible > 0 ? counts.eligible : undefined;

    return afterAlNavSections.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.path === '/after-al/eligibility' && eligibleBadge !== undefined) {
          return { ...item, badge: eligibleBadge };
        }
        return item;
      }),
    }));
  }, [counts.eligible, hasResult]);

  return (
    <DashboardLayout
      brandTitle="PathWise"
      portalBadge="After A/L Portal"
      sections={sections}
      showUserProfile={true}
      userStream={result?.stream}
      userYear={result?.examYear}
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
