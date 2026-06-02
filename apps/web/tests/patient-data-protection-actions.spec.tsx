import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientDataProtectionActions } from '../src/features/patients/components/PatientDataProtectionActions';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../src/lib/api-client', () => ({
  api: {
    get: (path: string) => mockGet(path),
    post: (path: string, body: unknown) => mockPost(path, body),
  },
}));

let authValue: Record<string, unknown> = {
  currentRole: 'TENANT_ADMIN',
  isSuperAdmin: false,
  isTenantAdmin: true,
};
vi.mock('../src/hooks/use-auth', () => ({ useAuth: () => authValue }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const PID = 'pat-1';

function renderActions(onAnonymised = vi.fn()) {
  return render(
    <PatientDataProtectionActions
      patientId={PID}
      patientName="Jane Doe"
      onAnonymised={onAnonymised}
    />,
  );
}

describe('PatientDataProtectionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authValue = { currentRole: 'TENANT_ADMIN', isSuperAdmin: false, isTenantAdmin: true };
    mockGet.mockResolvedValue({ patientId: PID });
    mockPost.mockResolvedValue({ patientId: PID });
    // jsdom lacks object URLs
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = vi.fn(() => 'blob:x');
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = vi.fn();
  });

  it('renders nothing for non-admin users', () => {
    authValue = { currentRole: 'NURSE', isSuperAdmin: false, isTenantAdmin: false };
    const { container } = renderActions();
    expect(container).toBeEmptyDOMElement();
  });

  it('exports patient data via the privacy endpoint', async () => {
    renderActions();
    await userEvent.click(screen.getByRole('button', { name: /export data/i }));
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(`/privacy/patients/${PID}/export`);
    });
  });

  it('hides the erase button for a plain ADMIN (erasure is tenant-admin only)', () => {
    authValue = { currentRole: 'ADMIN', isSuperAdmin: false, isTenantAdmin: false };
    renderActions();
    expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^erase data$/i })).not.toBeInTheDocument();
  });

  it('requires the patient id and a reason before anonymising', async () => {
    const onAnonymised = vi.fn();
    renderActions(onAnonymised);

    await userEvent.click(screen.getByRole('button', { name: /^erase data$/i }));
    const confirmBtn = screen.getByRole('button', { name: /confirm erasure/i });
    expect(confirmBtn).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Patient ID'), 'wrong-id');
    await userEvent.type(
      screen.getByPlaceholderText(/data subject erasure request/i),
      'DSAR request',
    );
    expect(confirmBtn).toBeDisabled(); // id mismatch

    await userEvent.clear(screen.getByPlaceholderText('Patient ID'));
    await userEvent.type(screen.getByPlaceholderText('Patient ID'), PID);
    expect(confirmBtn).toBeEnabled();

    await userEvent.click(confirmBtn);
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(`/privacy/patients/${PID}/anonymise`, {
        confirmation: PID,
        reason: 'DSAR request',
      });
    });
    expect(onAnonymised).toHaveBeenCalled();
  });
});
