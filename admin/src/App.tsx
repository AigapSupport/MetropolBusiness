import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { AdminLayout } from './layouts/AdminLayout';
import { AuditLogsPage } from './pages/Audit/AuditLogsPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { SetPasswordPage } from './pages/Auth/SetPasswordPage';
import { CampaignCategoriesPage } from './pages/Campaigns/CampaignCategoriesPage';
import { CampaignsPage } from './pages/Campaigns/CampaignsPage';
import { TenantsPage } from './pages/Companies/TenantsPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { GlobalContentPage } from './pages/GlobalContent/GlobalContentPage';
import { ModuleDefinitionsPage } from './pages/ModuleDefinitions/ModuleDefinitionsPage';

/** Rota haritası: /login public; kalan sayfalar auth guard + ortak layout altında. */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Davet token'ı ile şifre belirleme — public (?token=...). */}
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/module-definitions" element={<ModuleDefinitionsPage />} />
          <Route path="/global-content" element={<GlobalContentPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaign-categories" element={<CampaignCategoriesPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
