import { Navigate } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { AdminDocumentsPage } from '../pages/admin/AdminDocumentsPage';
import { AdminLayout } from '../components/admin/AdminLayout';

export const routes = [
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/after-ol',
    element: (
      <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center">
        <h1 className="text-4xl font-extrabold text-deep-blue mb-4">After O/L Pathways</h1>
        <p className="text-secondary text-xl">Coming soon...</p>
      </div>
    ),
  },
  {
    path: '/after-al',
    element: (
      <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center">
        <h1 className="text-4xl font-extrabold text-teal mb-4">After A/L Pathways</h1>
        <p className="text-secondary text-xl">Coming soon...</p>
      </div>
    ),
  },
  // Admin Routes
  {
    path: '/admin',
    element: <Navigate to="/admin/documents" replace />,
  },
  {
    path: '/admin/documents',
    element: <AdminDocumentsPage />,
  },
  {
    path: '/admin/upload',
    element: <AdminDocumentsPage />,
  },
  {
    path: '/admin/:section',
    element: (
      <AdminLayout
        title="Admin Module"
        subtitle="This section is currently under development for Phase 2."
      >
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-xs">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold">🛠️</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Coming Soon</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            This administration module is scheduled for Phase 2 implementation. Please visit the Documents section to upload and manage source materials.
          </p>
          <a
            href="/admin/documents"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Go to Documents
          </a>
        </div>
      </AdminLayout>
    ),
  },
];
