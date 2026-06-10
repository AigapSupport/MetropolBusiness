import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import { ToastProvider } from './components/ui/Toast';
import AdminLayout from './layouts/AdminLayout';
import AnnouncementsPage from './pages/Announcements/AnnouncementsPage';
import LoginPage from './pages/Auth/LoginPage';
import SetPasswordPage from './pages/Auth/SetPasswordPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ModulePermissionsPage from './pages/Modules/ModulePermissionsPage';
import RequestsPage from './pages/Requests/RequestsPage';
import SegmentsPage from './pages/Segments/SegmentsPage';
import SurveyEditorPage from './pages/Surveys/SurveyEditorPage';
import SurveyResultsPage from './pages/Surveys/SurveyResultsPage';
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
  // Davet linki: /auth/set-password?token=... (API_CONTRACT §1).
  { path: '/auth/set-password', element: <SetPasswordPage /> },
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
          { path: '/content/surveys/new', element: <SurveyEditorPage /> },
          { path: '/content/surveys/:surveyId', element: <SurveyEditorPage /> },
          { path: '/content/surveys/:surveyId/results', element: <SurveyResultsPage /> },
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
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  );
}
