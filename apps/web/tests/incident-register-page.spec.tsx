import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncidentRegisterPage } from '../src/features/settings/IncidentRegisterPage';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock('../src/lib/api-client', () => ({
  api: {
    get: (path: string) => mockGet(path),
    post: (path: string, body: unknown) => mockPost(path, body),
    patch: (path: string, body: unknown) => mockPatch(path, body),
  },
}));

let authValue: Record<string, unknown> = {
  currentRole: 'TENANT_ADMIN',
  isSuperAdmin: false,
  isTenantAdmin: true,
};
vi.mock('../src/hooks/use-auth', () => ({ useAuth: () => authValue }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const INCIDENT = {
  id: 'inc1',
  reference: 'INC-ABCD1234',
  title: 'Lost laptop',
  category: 'LOST_OR_STOLEN_DEVICE',
  severity: 'HIGH',
  status: 'OPEN',
  discoveredAt: '2026-06-01T00:00:00.000Z',
  icoReportable: true,
  icoReportedAt: null,
  icoReportOverdue: false,
};

describe('IncidentRegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authValue = { currentRole: 'TENANT_ADMIN', isSuperAdmin: false, isTenantAdmin: true };
    mockGet.mockResolvedValue([INCIDENT]);
    mockPost.mockResolvedValue({});
    mockPatch.mockResolvedValue({});
  });

  it('renders an access warning for non-admins', () => {
    authValue = { currentRole: 'NURSE', isSuperAdmin: false, isTenantAdmin: false };
    render(<IncidentRegisterPage />);
    expect(screen.getByText(/administrator access to manage incidents/i)).toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('lists incidents from the register', async () => {
    render(<IncidentRegisterPage />);
    await waitFor(() => expect(screen.getByText('Lost laptop')).toBeInTheDocument());
    expect(screen.getByText('INC-ABCD1234')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/incidents');
  });

  it('changes status via PATCH', async () => {
    render(<IncidentRegisterPage />);
    await waitFor(() => screen.getByText('Lost laptop'));

    await userEvent.selectOptions(
      screen.getByLabelText(/Status for INC-ABCD1234/i),
      'INVESTIGATING',
    );

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/incidents/inc1', { status: 'INVESTIGATING' });
    });
  });

  it('marks an incident as ICO-reported', async () => {
    render(<IncidentRegisterPage />);
    await waitFor(() => screen.getByText('Lost laptop'));

    await userEvent.click(screen.getByRole('button', { name: /mark ico reported/i }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/incidents/inc1', { icoReported: true });
    });
  });

  it('logs a new incident via POST', async () => {
    mockGet.mockResolvedValue([]);
    render(<IncidentRegisterPage />);
    await waitFor(() => screen.getByText(/no incidents recorded/i));

    await userEvent.click(screen.getByRole('button', { name: /^log incident$/i }));
    await userEvent.type(screen.getByPlaceholderText('Title'), 'Phishing email');
    await userEvent.type(screen.getByPlaceholderText(/what happened/i), 'Staff reported it');
    await userEvent.click(screen.getByRole('button', { name: /save incident/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/incidents',
        expect.objectContaining({ title: 'Phishing email', description: 'Staff reported it' }),
      );
    });
  });
});
