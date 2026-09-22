import { Outlet } from 'react-router-dom';
import { SavedCoursesProvider } from '../../context/SavedCoursesContext';

export const AfterOlRouteLayout = () => (
  <SavedCoursesProvider>
    <Outlet />
  </SavedCoursesProvider>
);
