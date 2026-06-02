import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubProcessorsPage } from '../src/features/settings/SubProcessorsPage';

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

let authValue: Record<string, unknown> = { isSuperAdmin: true };
vi.mock('../src/hooks/use-auth', () => ({ useAuth: () => authValue }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const DAY = 24 * 60 * 60 * 1000;
const CURRENT = [
  {
    id: 'sp1',
    name: 'Acme Email',
    purpose: 'Email delivery',
    location: 'EU',
    url: null,
    status: 'ACTIVE',
    effectiveDate: new Date(Date.now() - 10 * DAY).toISOString(),
    announcedAt: new Date(Date.now() - 40 * DAY).toISOString(),
  },
];
const CHANGES = [
  {
    id: 'sp2',
    name: 'New Vendor',
    purpose: 'Analytics',
    location: 'UK',
    url: null,
    status: 'ACTIVE',
    effectiveDate: new Date(Date.now() + 20 * DAY).toISOString(),
    announcedAt: new Date().toISOString(),
  },
];

const setData = (current = CURRENT, changes = CHANGES) =>
  mockGet.mockImplementation((path: string) =>
    Promise.resolve(path.includes('changes') ? changes : current),
  );

describe('SubProcessorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authValue = { isSuperAdmin: true };
    setData();
    mockPost.mockResolvedValue({});
    mockPatch.mockResolvedValue({});
  });

  it('lists current sub-processors and upcoming changes', async () => {
    render(<SubProcessorsPage />);
    await waitFor(() => expect(screen.getByText('Acme Email')).toBeInTheDocument());
    expect(screen.getByText('Upcoming changes')).toBeInTheDocument();
    expect(screen.getByText(/New Vendor/)).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/sub-processors');
    expect(mockGet).toHaveBeenCalledWith('/sub-processors/changes');
  });

  it('hides management controls for non-super-admins', async () => {
    authValue = { isSuperAdmin: false };
    render(<SubProcessorsPage />);
    await waitFor(() => screen.getByText('Acme Email'));
    expect(screen.queryByRole('button', { name: /add sub-processor/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument();
  });

  it('lets a super-admin announce a removal via PATCH', async () => {
    render(<SubProcessorsPage />);
    await waitFor(() => screen.getByText('Acme Email'));

    await userEvent.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/sub-processors/sp1', { status: 'REMOVED' });
    });
  });

  it('adds a sub-processor via POST', async () => {
    render(<SubProcessorsPage />);
    await waitFor(() => screen.getByText('Acme Email'));

    await userEvent.click(screen.getByRole('button', { name: /add sub-processor/i }));
    await userEvent.type(screen.getByPlaceholderText('Name'), 'Postmark');
    await userEvent.type(screen.getByPlaceholderText('Purpose'), 'Email');
    await userEvent.type(screen.getByPlaceholderText(/Location/i), 'US');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/sub-processors',
        expect.objectContaining({ name: 'Postmark', purpose: 'Email', location: 'US' }),
      );
    });
  });
});
