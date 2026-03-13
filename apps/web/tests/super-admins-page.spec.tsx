import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SuperAdminsPage } from '../src/features/super-admins/SuperAdminsPage';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockDeactivate = vi.fn();
const mockReactivate = vi.fn();

vi.mock('../src/features/super-admins/hooks/use-super-admins', () => ({
  useSuperAdmins: () => ({
    list: mockList,
    create: mockCreate,
    deactivate: mockDeactivate,
    reactivate: mockReactivate,
    loading: false,
    error: null,
  }),
}));

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'current-sa', firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN' },
    isSuperAdmin: true,
    selectedTenant: null,
    logout: vi.fn(),
    selectTenant: vi.fn(),
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SuperAdminsPage />
    </MemoryRouter>,
  );
}

const mockAdmin = {
  id: 'sa-1',
  email: 'admin@care-solutions.local',
  firstName: 'Super',
  lastName: 'Admin',
  role: 'SUPER_ADMIN',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const otherAdmin = {
  id: 'sa-2',
  email: 'other@care-solutions.local',
  firstName: 'Other',
  lastName: 'Admin',
  role: 'SUPER_ADMIN',
  isActive: true,
  createdAt: '2026-02-01T00:00:00Z',
};

describe('SuperAdminsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({
      data: [mockAdmin, otherAdmin],
      total: 2,
      page: 1,
      limit: 20,
    });
  });

  it('renders the page header and add button', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Super Admins')).toBeInTheDocument();
    });
    expect(screen.getByText('Add Super Admin')).toBeInTheDocument();
  });

  it('loads and displays super admins', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('admin@care-solutions.local')).toBeInTheDocument();
    });
    expect(screen.getByText('other@care-solutions.local')).toBeInTheDocument();
  });

  it('shows empty state when no super admins', async () => {
    mockList.mockResolvedValueOnce({ data: [], total: 0, page: 1, limit: 20 });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no super admins found/i)).toBeInTheDocument();
    });
  });

  it('shows "You" label for current user instead of action buttons', async () => {
    // mockAdmin has id 'sa-1' but current user is 'current-sa'
    // Let's make mockAdmin match current user
    mockList.mockResolvedValueOnce({
      data: [{ ...mockAdmin, id: 'current-sa' }, otherAdmin],
      total: 2,
      page: 1,
      limit: 20,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('You')).toBeInTheDocument();
    });
  });

  it('opens create modal when Add Super Admin is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Super Admins')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Super Admin'));
    expect(screen.getByText('Add Super Admin', { selector: 'h2' })).toBeInTheDocument();
  });

  it('validates required fields in create modal', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Super Admins')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Super Admin'));

    // Create button should be disabled when form is empty
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();

    // Tab through fields to trigger blur validation
    const firstNameInput = screen.getByPlaceholderText('John');
    firstNameInput.focus();
    await user.tab(); // blur first name → focus last name
    await user.tab(); // blur last name → focus email
    await user.tab(); // blur email → focus password
    await user.tab(); // blur password

    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Super Admins')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Super Admin'));

    const emailInput = screen.getByPlaceholderText('admin@care-solutions.local');
    await user.type(emailInput, 'invalid-email');
    await user.tab();

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('validates password length', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Super Admins')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Super Admin'));

    const passwordInput = screen.getByPlaceholderText('Minimum 8 characters');
    await user.type(passwordInput, 'short');
    await user.tab();

    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  });

  it('creates a super admin with valid data', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'sa-new' });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Super Admins')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Super Admin'));

    await user.type(screen.getByPlaceholderText('John'), 'New');
    await user.type(screen.getByPlaceholderText('Smith'), 'Admin');
    await user.type(screen.getByPlaceholderText('admin@care-solutions.local'), 'new@test.com');
    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'Password123!');

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        firstName: 'New',
        lastName: 'Admin',
        email: 'new@test.com',
        password: 'Password123!',
      });
    });
  });

  it('deactivates another super admin', async () => {
    mockDeactivate.mockResolvedValueOnce({ id: 'sa-2', isActive: false });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('other@care-solutions.local')).toBeInTheDocument();
    });

    // There should be a Deactivate button for the other admin
    const deactivateButtons = screen.getAllByText('Deactivate');
    await user.click(deactivateButtons[0]);

    await waitFor(() => {
      expect(mockDeactivate).toHaveBeenCalled();
    });
  });

  it('reactivates an inactive super admin', async () => {
    mockList.mockResolvedValueOnce({
      data: [{ ...otherAdmin, isActive: false }],
      total: 1,
      page: 1,
      limit: 20,
    });
    mockReactivate.mockResolvedValueOnce({ id: 'sa-2', isActive: true });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Reactivate'));

    await waitFor(() => {
      expect(mockReactivate).toHaveBeenCalledWith('sa-2');
    });
  });

  it('closes create modal on cancel', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Super Admins')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Super Admin'));
    expect(screen.getByText('Add Super Admin', { selector: 'h2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Add Super Admin', { selector: 'h2' })).not.toBeInTheDocument();
    });
  });
});
