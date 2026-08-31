import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes/routes';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SessionExpiryModal } from './components/common/SessionExpiryModal';

const router = createBrowserRouter(routes);

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
        <SessionExpiryModal />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
