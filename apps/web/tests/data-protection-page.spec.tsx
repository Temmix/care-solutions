import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DataProtectionSettingsPage } from '../src/features/settings/DataProtectionSettingsPage';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../src/lib/api-client', () => ({
  api: {
    get: (path: string) => mockGet(path),
    post: (path: string, body: unknown) => mockPost(path, body),
  },
}));

// Auth value is mutable so individual tests can flip the role.
let authValue: Record<string, unknown> = {
  currentRole: 'TENANT_ADMIN',
  isSuperAdmin: false,
  isTenantAdmin: true,
};
vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => authValue,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const STATUS = {
  documents: [
    {
      type: 'DPA',
      title: 'Data Processing Agreement',
      version: '2026-04-15',
      accepted: false,
      acceptedAt: null,
      acceptedById: null,
    },
    {
      type: 'PRIVACY_POLICY',
      title: 'Privacy Policy',
      version: '2026-04-15',
      accepted: true,
      acceptedAt: '2026-05-01T00:00:00.000Z',
      acceptedById: 'u1',
    },
  ],
  outstanding: ['DPA'],
  allAccepted: false,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <DataProtectionSettingsPage />
    </MemoryRouter>,
  );
}

describe('DataProtectionSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authValue = { currentRole: 'TENANT_ADMIN', isSuperAdmin: false, isTenantAdmin: true };
    mockGet.mockResolvedValue(STATUS);
    mockPost.mockResolvedValue({ id: 'la1' });
  });

  it('lists documents with accepted / outstanding status', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Data Processing Agreement')).toBeInTheDocument();
    });
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/legal/acceptances/status');
  });

  it('records acceptance and reloads when Accept is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Data Processing Agreement'));

    await userEvent.click(screen.getByRole('button', { name: /accept/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/legal/acceptances', { documentType: 'DPA' });
    });
    // initial load + reload after accept
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('shows an access warning and does not fetch for non-admins', async () => {
    authValue = { currentRole: 'NURSE', isSuperAdmin: false, isTenantAdmin: false };
    renderPage();

    expect(screen.getByText(/administrator access to manage data-protection/i)).toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalled();
  });
});
