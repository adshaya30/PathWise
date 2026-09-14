import { Outlet } from 'react-router-dom';
import { StudentEligibilityProvider } from '../../context/StudentEligibilityContext';
import { SavedCoursesProvider } from '../../context/SavedCoursesContext';

export const AfterAlRouteLayout = () => (
  <StudentEligibilityProvider>
    <SavedCoursesProvider>
      <Outlet />
    </SavedCoursesProvider>
  </StudentEligibilityProvider>
);