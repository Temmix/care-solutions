import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ModuleGuard } from '../src/components/ModuleGuard';

let authValue: Record<string, unknown>;
vi.mock('../src/hooks/use-auth', () => ({ useAuth: () => authValue }));

function renderGuard(moduleCode: string) {
  return render(
    <MemoryRouter initialEntries={['/app/x']}>
      <Routes>
        <Route path="/app" element={<div>Dashboard</div>} />
        <Route
          path="/app/x"
          element={
            <ModuleGuard moduleCode={moduleCode}>
              <div>Clinical Page</div>
            </ModuleGuard>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ModuleGuard — clinical access for platform admins', () => {
  it('redirects SUPER_ADMIN away from a clinical module', () => {
    authValue = { isSuperAdmin: true, isModuleEnabled: () => true };
    renderGuard('PATIENTS');
    expect(screen.queryByText('Clinical Page')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('allows a non-platform admin (ADMIN) into a clinical module', () => {
    authValue = { isSuperAdmin: false, isModuleEnabled: () => true };
    renderGuard('PATIENTS');
    expect(screen.getByText('Clinical Page')).toBeInTheDocument();
  });

  it('still allows SUPER_ADMIN into a non-clinical module', () => {
    authValue = { isSuperAdmin: true, isModuleEnabled: () => true };
    renderGuard('REPORTS');
    expect(screen.getByText('Clinical Page')).toBeInTheDocument();
  });
});
