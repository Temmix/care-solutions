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
import { SelectTenantPage } from './features/tenants/SelectTenantPage';
import { PractitionersPage } from './features/practitioners/PractitionersPage';
import { SuperAdminsPage } from './features/super-admins/SuperAdminsPage';
import { TenantAdminsPage } from './features/tenant-admins/TenantAdminsPage';
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
import { MedicationTypesSettingsPage } from './features/settings/MedicationTypesSettingsPage';
import { OrganisationSettingsPage } from './features/settings/OrganisationSettingsPage';
import { MedicationsListPage } from './features/medications/MedicationsListPage';
import { MedicationsCreatePage } from './features/medications/MedicationsCreatePage';
import { MedicationsDetailPage } from './features/medications/MedicationsDetailPage';
import { RosterPage } from './features/workforce/RosterPage';
import { ShiftPatternsPage } from './features/workforce/ShiftPatternsPage';
import { AvailabilityPage } from './features/workforce/AvailabilityPage';
import { PatientFlowDashboardPage } from './features/patient-flow/PatientFlowDashboardPage';
import { LocationsPage } from './features/patient-flow/LocationsPage';
import { AdmitPatientPage } from './features/patient-flow/AdmitPatientPage';
import { EncounterDetailPage } from './features/patient-flow/EncounterDetailPage';
import { DischargePlanPage } from './features/patient-flow/DischargePlanPage';
import { SwapMarketplacePage } from './features/workforce/SwapMarketplacePage';
import { ComplianceDashboardPage } from './features/workforce/ComplianceDashboardPage';
import { ChcListPage } from './features/chc/ChcListPage';
import { ChcCreatePage } from './features/chc/ChcCreatePage';
import { ChcDetailPage } from './features/chc/ChcDetailPage';
import { VirtualWardsDashboardPage } from './features/virtual-wards/VirtualWardsDashboardPage';
import { VirtualWardsEnrolPage } from './features/virtual-wards/VirtualWardsEnrolPage';
import { VirtualWardsDetailPage } from './features/virtual-wards/VirtualWardsDetailPage';
import { DemoPage } from './features/demo/DemoPage';
import { Toaster } from 'react-hot-toast';

export function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<DemoPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/app"
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
            <Route path="select-tenant" element={<SelectTenantPage />} />
            <Route path="super-admins" element={<SuperAdminsPage />} />
            <Route path="tenant-admins" element={<TenantAdminsPage />} />
            <Route path="care-plans" element={<CarePlanListPage />} />
            <Route path="care-plans/new" element={<CarePlanCreatePage />} />
            <Route path="care-plans/:id" element={<CarePlanDetailPage />} />
            <Route path="medications" element={<MedicationsListPage />} />
            <Route path="medications/new" element={<MedicationsCreatePage />} />
            <Route path="medications/:id" element={<MedicationsDetailPage />} />
            <Route path="assessments" element={<AssessmentListPage />} />
            <Route path="assessments/new" element={<AssessmentCreatePage />} />
            <Route path="assessments/:id" element={<AssessmentDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/assessment-types" element={<AssessmentTypesSettingsPage />} />
            <Route path="settings/specialty-types" element={<SpecialtyTypesSettingsPage />} />
            <Route path="settings/medication-types" element={<MedicationTypesSettingsPage />} />
            <Route path="settings/organisation" element={<OrganisationSettingsPage />} />
            <Route path="roster" element={<RosterPage />} />
            <Route path="shift-patterns" element={<ShiftPatternsPage />} />
            <Route path="availability" element={<AvailabilityPage />} />
            <Route path="patient-flow" element={<PatientFlowDashboardPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="admit" element={<AdmitPatientPage />} />
            <Route path="encounters/:id" element={<EncounterDetailPage />} />
            <Route path="encounters/:id/discharge-plan" element={<DischargePlanPage />} />
            <Route path="swap-marketplace" element={<SwapMarketplacePage />} />
            <Route path="compliance" element={<ComplianceDashboardPage />} />
            <Route path="chc" element={<ChcListPage />} />
            <Route path="chc/new" element={<ChcCreatePage />} />
            <Route path="chc/:id" element={<ChcDetailPage />} />
            <Route path="virtual-wards" element={<VirtualWardsDashboardPage />} />
            <Route path="virtual-wards/enrol" element={<VirtualWardsEnrolPage />} />
            <Route path="virtual-wards/:id" element={<VirtualWardsDetailPage />} />
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
