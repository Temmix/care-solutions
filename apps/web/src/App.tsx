import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/use-auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './features/auth/LoginPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
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
import { TrainingTypesSettingsPage } from './features/settings/TrainingTypesSettingsPage';
import { ModuleVisibilitySettingsPage } from './features/settings/ModuleVisibilitySettingsPage';
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
import { AuditLogPage } from './features/audit/AuditLogPage';
import { ComplianceDashboardPage as AuditCompliancePage } from './features/audit/ComplianceDashboardPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { NotificationPreferencesPage } from './features/notifications/NotificationPreferencesPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { DevicesListPage } from './features/iot/DevicesListPage';
import { DeviceDetailPage } from './features/iot/DeviceDetailPage';
import { ApiKeysPage } from './features/iot/ApiKeysPage';
import { TrainingListPage } from './features/training/TrainingListPage';
import { TrainingDetailPage } from './features/training/TrainingDetailPage';
import { MyTrainingPage } from './features/training/MyTrainingPage';
import { DemoPage } from './features/demo/DemoPage';
import { ModuleGuard } from './components/ModuleGuard';
import { Toaster } from 'react-hot-toast';

export function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<DemoPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
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
            {/* Patients */}
            <Route
              path="patients"
              element={
                <ModuleGuard moduleCode="PATIENTS">
                  <PatientListPage />
                </ModuleGuard>
              }
            />
            <Route
              path="patients/new"
              element={
                <ModuleGuard moduleCode="PATIENTS">
                  <PatientCreatePage />
                </ModuleGuard>
              }
            />
            <Route
              path="patients/:id"
              element={
                <ModuleGuard moduleCode="PATIENTS">
                  <PatientDetailPage />
                </ModuleGuard>
              }
            />

            {/* Care Plans */}
            <Route
              path="care-plans"
              element={
                <ModuleGuard moduleCode="CARE_PLANS">
                  <CarePlanListPage />
                </ModuleGuard>
              }
            />
            <Route
              path="care-plans/new"
              element={
                <ModuleGuard moduleCode="CARE_PLANS">
                  <CarePlanCreatePage />
                </ModuleGuard>
              }
            />
            <Route
              path="care-plans/:id"
              element={
                <ModuleGuard moduleCode="CARE_PLANS">
                  <CarePlanDetailPage />
                </ModuleGuard>
              }
            />

            {/* Medications */}
            <Route
              path="medications"
              element={
                <ModuleGuard moduleCode="MEDICATIONS">
                  <MedicationsListPage />
                </ModuleGuard>
              }
            />
            <Route
              path="medications/new"
              element={
                <ModuleGuard moduleCode="MEDICATIONS">
                  <MedicationsCreatePage />
                </ModuleGuard>
              }
            />
            <Route
              path="medications/:id"
              element={
                <ModuleGuard moduleCode="MEDICATIONS">
                  <MedicationsDetailPage />
                </ModuleGuard>
              }
            />

            {/* Assessments */}
            <Route
              path="assessments"
              element={
                <ModuleGuard moduleCode="ASSESSMENTS">
                  <AssessmentListPage />
                </ModuleGuard>
              }
            />
            <Route
              path="assessments/new"
              element={
                <ModuleGuard moduleCode="ASSESSMENTS">
                  <AssessmentCreatePage />
                </ModuleGuard>
              }
            />
            <Route
              path="assessments/:id"
              element={
                <ModuleGuard moduleCode="ASSESSMENTS">
                  <AssessmentDetailPage />
                </ModuleGuard>
              }
            />

            {/* Roster & Scheduling */}
            <Route
              path="roster"
              element={
                <ModuleGuard moduleCode="ROSTER">
                  <RosterPage />
                </ModuleGuard>
              }
            />
            <Route
              path="shift-patterns"
              element={
                <ModuleGuard moduleCode="ROSTER">
                  <ShiftPatternsPage />
                </ModuleGuard>
              }
            />
            <Route
              path="availability"
              element={
                <ModuleGuard moduleCode="ROSTER">
                  <AvailabilityPage />
                </ModuleGuard>
              }
            />
            <Route
              path="swap-marketplace"
              element={
                <ModuleGuard moduleCode="ROSTER">
                  <SwapMarketplacePage />
                </ModuleGuard>
              }
            />

            {/* Compliance */}
            <Route
              path="compliance"
              element={
                <ModuleGuard moduleCode="COMPLIANCE">
                  <ComplianceDashboardPage />
                </ModuleGuard>
              }
            />

            {/* Patient Flow */}
            <Route
              path="patient-flow"
              element={
                <ModuleGuard moduleCode="PATIENT_FLOW">
                  <PatientFlowDashboardPage />
                </ModuleGuard>
              }
            />
            <Route
              path="locations"
              element={
                <ModuleGuard moduleCode="PATIENT_FLOW">
                  <LocationsPage />
                </ModuleGuard>
              }
            />
            <Route
              path="admit"
              element={
                <ModuleGuard moduleCode="PATIENT_FLOW">
                  <AdmitPatientPage />
                </ModuleGuard>
              }
            />
            <Route
              path="encounters/:id"
              element={
                <ModuleGuard moduleCode="PATIENT_FLOW">
                  <EncounterDetailPage />
                </ModuleGuard>
              }
            />
            <Route
              path="encounters/:id/discharge-plan"
              element={
                <ModuleGuard moduleCode="PATIENT_FLOW">
                  <DischargePlanPage />
                </ModuleGuard>
              }
            />

            {/* CHC */}
            <Route
              path="chc"
              element={
                <ModuleGuard moduleCode="CHC">
                  <ChcListPage />
                </ModuleGuard>
              }
            />
            <Route
              path="chc/new"
              element={
                <ModuleGuard moduleCode="CHC">
                  <ChcCreatePage />
                </ModuleGuard>
              }
            />
            <Route
              path="chc/:id"
              element={
                <ModuleGuard moduleCode="CHC">
                  <ChcDetailPage />
                </ModuleGuard>
              }
            />

            {/* Virtual Wards */}
            <Route
              path="virtual-wards"
              element={
                <ModuleGuard moduleCode="VIRTUAL_WARDS">
                  <VirtualWardsDashboardPage />
                </ModuleGuard>
              }
            />
            <Route
              path="virtual-wards/enrol"
              element={
                <ModuleGuard moduleCode="VIRTUAL_WARDS">
                  <VirtualWardsEnrolPage />
                </ModuleGuard>
              }
            />
            <Route
              path="virtual-wards/:id"
              element={
                <ModuleGuard moduleCode="VIRTUAL_WARDS">
                  <VirtualWardsDetailPage />
                </ModuleGuard>
              }
            />

            {/* IoT */}
            <Route
              path="iot/devices"
              element={
                <ModuleGuard moduleCode="IOT">
                  <DevicesListPage />
                </ModuleGuard>
              }
            />
            <Route
              path="iot/devices/:id"
              element={
                <ModuleGuard moduleCode="IOT">
                  <DeviceDetailPage />
                </ModuleGuard>
              }
            />
            <Route
              path="iot/api-keys"
              element={
                <ModuleGuard moduleCode="IOT">
                  <ApiKeysPage />
                </ModuleGuard>
              }
            />

            {/* Training */}
            <Route
              path="training"
              element={
                <ModuleGuard moduleCode="TRAINING">
                  <TrainingListPage />
                </ModuleGuard>
              }
            />
            <Route
              path="training/:id"
              element={
                <ModuleGuard moduleCode="TRAINING">
                  <TrainingDetailPage />
                </ModuleGuard>
              }
            />
            <Route
              path="my-training"
              element={
                <ModuleGuard moduleCode="TRAINING">
                  <MyTrainingPage />
                </ModuleGuard>
              }
            />

            {/* Reports & Billing */}
            <Route
              path="reports"
              element={
                <ModuleGuard moduleCode="REPORTS">
                  <ReportsPage />
                </ModuleGuard>
              }
            />
            <Route
              path="billing"
              element={
                <ModuleGuard moduleCode="BILLING">
                  <BillingPage />
                </ModuleGuard>
              }
            />

            {/* Always visible */}
            <Route path="practitioners" element={<PractitionersPage />} />
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="select-tenant" element={<SelectTenantPage />} />
            <Route path="super-admins" element={<SuperAdminsPage />} />
            <Route path="tenant-admins" element={<TenantAdminsPage />} />
            <Route path="audit" element={<AuditLogPage />} />
            <Route path="audit/compliance" element={<AuditCompliancePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="change-password" element={<ChangePasswordPage />} />

            {/* Settings */}
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/organisation" element={<OrganisationSettingsPage />} />
            <Route path="settings/assessment-types" element={<AssessmentTypesSettingsPage />} />
            <Route path="settings/specialty-types" element={<SpecialtyTypesSettingsPage />} />
            <Route path="settings/medication-types" element={<MedicationTypesSettingsPage />} />
            <Route path="settings/training-types" element={<TrainingTypesSettingsPage />} />
            <Route path="settings/modules" element={<ModuleVisibilitySettingsPage />} />
            <Route path="settings/notifications" element={<NotificationPreferencesPage />} />
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
