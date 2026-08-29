import { useState, type FC, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
}

export const AdminLayout: FC<AdminLayoutProps> = ({
  title = 'Documents',
  subtitle = 'Upload, review, and verify knowledge-base source documents.',
  children,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AdminHeader
          onMenuClick={() => setIsMobileOpen(true)}
          title={title}
          subtitle={subtitle}
        />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
