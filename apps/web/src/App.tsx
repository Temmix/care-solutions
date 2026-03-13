import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/use-auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { DashboardPage } from './features/auth/DashboardPage';
import { PatientListPage } from './features/patients/PatientListPage';
import { PatientCreatePage } from './features/patients/PatientCreatePage';
import { PatientDetailPage } from './features/patients/PatientDetailPage';
import { TenantsPage } from './features/tenants/TenantsPage';
import { PractitionersPage } from './features/practitioners/PractitionersPage';
import { SuperAdminsPage } from './features/super-admins/SuperAdminsPage';
import { BillingPage } from './features/billing/BillingPage';
import { CarePlanListPage } from './features/care-plans/CarePlanListPage';
import { CarePlanCreatePage } from './features/care-plans/CarePlanCreatePage';
import { CarePlanDetailPage } from './features/care-plans/CarePlanDetailPage';
import { TeamPage } from './features/team/TeamPage';
import { ChangePasswordPage } from './features/auth/ChangePasswordPage';
import { AssessmentListPage } from './features/assessments/AssessmentListPage';
import { AssessmentCreatePage } from './features/assessments/AssessmentCreatePage';
import { AssessmentDetailPage } from './features/assessments/AssessmentDetailPage';
import { AssessmentTypesSettingsPage } from './features/settings/AssessmentTypesSettingsPage';
import { SpecialtyTypesSettingsPage } from './features/settings/SpecialtyTypesSettingsPage';
import { SettingsPage } from './features/settings/SettingsPage';

export function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="patients" element={<PatientListPage />} />
            <Route path="patients/new" element={<PatientCreatePage />} />
            <Route path="patients/:id" element={<PatientDetailPage />} />
            <Route path="practitioners" element={<PractitionersPage />} />
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="super-admins" element={<SuperAdminsPage />} />
            <Route path="care-plans" element={<CarePlanListPage />} />
            <Route path="care-plans/new" element={<CarePlanCreatePage />} />
            <Route path="care-plans/:id" element={<CarePlanDetailPage />} />
            <Route path="assessments" element={<AssessmentListPage />} />
            <Route path="assessments/new" element={<AssessmentCreatePage />} />
            <Route path="assessments/:id" element={<AssessmentDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/assessment-types" element={<AssessmentTypesSettingsPage />} />
            <Route path="settings/specialty-types" element={<SpecialtyTypesSettingsPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="change-password" element={<ChangePasswordPage />} />
          </Route>
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage forced />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
