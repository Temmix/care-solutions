import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '../src/features/auth/RegisterPage';

const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({
    register: mockRegister,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with all fields', () => {
    renderRegisterPage();

    expect(screen.getByPlaceholderText('Jane')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Smith')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@organisation.nhs.uk')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Min. 8 characters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Sunrise Care Home')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('calls register on submit', async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    renderRegisterPage();

    await user.type(screen.getByPlaceholderText('Jane'), 'John');
    await user.type(screen.getByPlaceholderText('Smith'), 'Doe');
    await user.type(screen.getByPlaceholderText('you@organisation.nhs.uk'), 'john@example.com');
    await user.type(screen.getByPlaceholderText('Min. 8 characters'), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        tenantName: undefined,
        organizationType: undefined,
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/app');
  });

  it('shows organisation type select when tenantName is entered', async () => {
    const user = userEvent.setup();

    renderRegisterPage();

    // Organisation type dropdown should not be visible initially
    expect(screen.queryByText(/organisation type/i)).not.toBeInTheDocument();

    // Type a tenant name
    await user.type(screen.getByPlaceholderText('e.g. Sunrise Care Home'), 'My Care Home');

    // Now the org type dropdown should appear
    expect(screen.getByText(/organisation type/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Care Home')).toBeInTheDocument();
  });

  it('includes tenantName and organizationType in register call when provided', async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    renderRegisterPage();

    await user.type(screen.getByPlaceholderText('Jane'), 'John');
    await user.type(screen.getByPlaceholderText('Smith'), 'Doe');
    await user.type(screen.getByPlaceholderText('you@organisation.nhs.uk'), 'john@example.com');
    await user.type(screen.getByPlaceholderText('Min. 8 characters'), 'password123');
    await user.type(screen.getByPlaceholderText('e.g. Sunrise Care Home'), 'Sunrise Care');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        tenantName: 'Sunrise Care',
        organizationType: 'CARE_HOME',
      });
    });
  });

  it('has link to login page', () => {
    renderRegisterPage();

    const link = screen.getByRole('link', { name: /sign in/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });
});
