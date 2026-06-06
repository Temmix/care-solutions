import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';

/**
 * Module codes whose data is patient clinical (PHI). Platform administrators
 * (SUPER_ADMIN) have no tenant membership and no clinical role, so they must
 * never view these screens — mirrors the API's ClinicalAccessGuard.
 */
const CLINICAL_MODULES = new Set([
  'PATIENTS',
  'CARE_PLANS',
  'MEDICATIONS',
  'ASSESSMENTS',
  'PATIENT_FLOW',
  'CHC',
  'VIRTUAL_WARDS',
]);

interface ModuleGuardProps {
  moduleCode: string;
  children: ReactNode;
}

export function ModuleGuard({ moduleCode, children }: ModuleGuardProps): React.ReactElement {
  const { isModuleEnabled, isSuperAdmin } = useAuth();

  if (isSuperAdmin && CLINICAL_MODULES.has(moduleCode)) {
    return <Navigate to="/app" replace />;
  }

  if (!isModuleEnabled(moduleCode)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
