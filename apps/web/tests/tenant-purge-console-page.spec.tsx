import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantPurgeConsolePage } from '../src/features/settings/TenantPurgeConsolePage';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../src/lib/api-client', () => ({
  api: {
    get: (path: string) => mockGet(path),
    post: (path: string, body: unknown) => mockPost(path, body),
  },
}));

let authValue: Record<string, unknown> = { isSuperAdmin: true };
vi.mock('../src/hooks/use-auth', () => ({ useAuth: () => authValue }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const CANDIDATE = {
  tenantId: 'org-9',
  name: 'Old Co',
  terminatedAt: '2026-04-01T00:00:00.000Z',
  purgeDueAt: '2026-05-01T00:00:00.000Z',
  daysSinceDue: 12,
};

describe('TenantPurgeConsolePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authValue = { isSuperAdmin: true };
    mockGet.mockResolvedValue([CANDIDATE]);
    mockPost.mockResolvedValue({
      tenantId: 'org-9',
      dryRun: true,
      counts: { patients: 5, encounters: 2, chcCases: 1, virtualWardEnrolments: 0 },
      purgedAt: null,
    });
  });

  it('restricts the console to platform admins', () => {
    authValue = { isSuperAdmin: false };
    render(<TenantPurgeConsolePage />);
    expect(screen.getByText(/restricted to platform administrators/i)).toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('lists purge candidates', async () => {
    render(<TenantPurgeConsolePage />);
    await waitFor(() => expect(screen.getByText('Old Co')).toBeInTheDocument());
    expect(screen.getByText('org-9')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/tenant-purge/candidates');
  });

  it('previews impact via a dry run', async () => {
    render(<TenantPurgeConsolePage />);
    await waitFor(() => screen.getByText('Old Co'));

    await userEvent.click(screen.getByRole('button', { name: /review & purge/i }));
    await userEvent.type(screen.getByPlaceholderText(/Contract terminated/i), 'Retention expired');
    await userEvent.click(screen.getByRole('button', { name: /preview impact/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/tenant-purge/org-9/execute', {
        confirmation: 'org-9',
        reason: 'Retention expired',
        dryRun: true,
      });
    });
    expect(screen.getByText(/Would delete: 5 patients/i)).toBeInTheDocument();
  });

  it('executes the purge only with a matching typed confirmation', async () => {
    render(<TenantPurgeConsolePage />);
    await waitFor(() => screen.getByText('Old Co'));

    await userEvent.click(screen.getByRole('button', { name: /review & purge/i }));
    await userEvent.type(screen.getByPlaceholderText(/Contract terminated/i), 'Retention expired');

    const deleteBtn = screen.getByRole('button', { name: /permanently delete/i });
    expect(deleteBtn).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Tenant ID'), 'org-9');
    expect(deleteBtn).toBeEnabled();

    mockPost.mockResolvedValueOnce({ tenantId: 'org-9', dryRun: false, counts: {}, purgedAt: 'x' });
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/tenant-purge/org-9/execute', {
        confirmation: 'org-9',
        reason: 'Retention expired',
        dryRun: false,
      });
    });
  });
});
