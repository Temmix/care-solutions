import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TeamPage } from '../src/features/team/TeamPage';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockDeactivate = vi.fn();
const mockReactivate = vi.fn();
const mockRemove = vi.fn();

vi.mock('../src/features/team/hooks/use-team', () => ({
  useTeam: () => ({
    list: mockList,
    create: mockCreate,
    update: vi.fn(),
    deactivate: mockDeactivate,
    reactivate: mockReactivate,
    remove: mockRemove,
    loading: false,
    error: null,
  }),
}));

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'current-user', role: 'ADMIN' },
  }),
}));

vi.mock('../src/components/UsageBanner', () => ({
  UsageBanner: () => null,
  useUsage: () => ({ usage: null, refresh: vi.fn() }),
}));

const baseMember = {
  email: 'jane@test.com',
  firstName: 'Jane',
  lastName: 'Doe',
  role: 'NURSE',
  isActive: true,
  mustChangePassword: false,
  createdAt: '2026-01-15T00:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <TeamPage />
    </MemoryRouter>,
  );
}

describe('TeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({
      data: [{ id: 'u1', ...baseMember }],
      total: 1,
      page: 1,
      limit: 20,
    });
  });

  it('renders team members with Remove button', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('does not show Remove button for current user', async () => {
    mockList.mockResolvedValue({
      data: [
        {
          id: 'current-user',
          ...baseMember,
          email: 'me@test.com',
          firstName: 'Me',
          lastName: 'Admin',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Me Admin')).toBeInTheDocument();
    });

    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });

  it('shows confirmation modal when Remove is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Remove'));

    expect(screen.getByText('Remove Member')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove/)).toBeInTheDocument();
    expect(screen.getByText(/notification email will be sent/)).toBeInTheDocument();
  });

  it('closes modal when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Remove'));
    expect(screen.getByText('Remove Member')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Remove Member')).not.toBeInTheDocument();
    });
  });

  it('calls remove API and refreshes list on confirm', async () => {
    mockRemove.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Remove'));

    // Modal has its own Remove button — pick the one inside the modal
    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    await user.click(removeButtons[removeButtons.length - 1]);

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith('u1');
    });

    // List should be refreshed after removal
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('shows error when remove fails', async () => {
    mockRemove.mockRejectedValue(new Error('Cannot remove admin'));
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Remove'));

    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    await user.click(removeButtons[removeButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('Cannot remove admin')).toBeInTheDocument();
    });
  });

  it('shows Deactivate and Remove buttons side by side for active members', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('Deactivate')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('shows Reactivate and Remove buttons for inactive members', async () => {
    mockList.mockResolvedValue({
      data: [{ id: 'u1', ...baseMember, isActive: false }],
      total: 1,
      page: 1,
      limit: 20,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('Reactivate')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });
});
