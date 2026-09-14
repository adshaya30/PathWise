import { type FC, type ReactNode } from 'react';
import { DashboardLayout } from '../common/DashboardLayout';
import { adminNavItems, adminBottomNavItems } from '../../config/navigationConfigs';

interface AdminLayoutProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export const AdminLayout: FC<AdminLayoutProps> = ({
  title = 'Documents',
  subtitle = 'Upload, review, and verify knowledge-base source documents.',
  actions,
  children,
}) => {
  return (
    <DashboardLayout
      brandTitle="PathWise"
      portalBadge="Admin Portal"
      navItems={adminNavItems}
      bottomNavItems={adminBottomNavItems}
      title={title}
      subtitle={subtitle}
      actions={actions}
      maxWidthClass="w-full max-w-[1650px] px-4 md:px-8"
    >
      {children}
    </DashboardLayout>
  );
};

