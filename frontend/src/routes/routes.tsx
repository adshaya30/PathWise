import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';

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
];
