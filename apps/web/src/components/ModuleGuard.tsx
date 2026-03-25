import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';

interface ModuleGuardProps {
  moduleCode: string;
  children: ReactNode;
}

export function ModuleGuard({ moduleCode, children }: ModuleGuardProps): React.ReactElement {
  const { isModuleEnabled } = useAuth();

  if (!isModuleEnabled(moduleCode)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
