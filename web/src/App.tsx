import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import AdminLayout from './layouts/AdminLayout';
import AnnouncementsPage from './pages/Announcements/AnnouncementsPage';
import LoginPage from './pages/Auth/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ModulePermissionsPage from './pages/Modules/ModulePermissionsPage';
import RequestsPage from './pages/Requests/RequestsPage';
import SegmentsPage from './pages/Segments/SegmentsPage';
import SurveysPage from './pages/Surveys/SurveysPage';
import UsersPage from './pages/Users/UsersPage';
import VideosPage from './pages/Videos/VideosPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/users', element: <UsersPage /> },
          { path: '/segments', element: <SegmentsPage /> },
          { path: '/module-permissions', element: <ModulePermissionsPage /> },
          { path: '/content/surveys', element: <SurveysPage /> },
          { path: '/content/announcements', element: <AnnouncementsPage /> },
          { path: '/content/videos', element: <VideosPage /> },
          { path: '/requests', element: <RequestsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
