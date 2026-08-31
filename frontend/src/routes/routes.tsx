import { Navigate } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { OtpVerificationPage } from '../pages/OtpVerificationPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { AdminDocumentsPage } from '../pages/admin/AdminDocumentsPage';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminRoute } from './AdminRoute';

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
    path: '/verify-otp',
    element: <OtpVerificationPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
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
  // Protected Admin Routes
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <Navigate to="/admin/documents" replace />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/documents',
    element: (
      <AdminRoute>
        <AdminDocumentsPage />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/upload',
    element: (
      <AdminRoute>
        <AdminDocumentsPage />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/:section',
    element: (
      <AdminRoute>
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
      </AdminRoute>
    ),
  },
];
