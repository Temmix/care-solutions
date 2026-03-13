import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PractitionersPage } from '../src/features/practitioners/PractitionersPage';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../src/features/practitioners/hooks/use-practitioners', () => ({
  usePractitioners: () => ({
    list: mockList,
    create: mockCreate,
    update: mockUpdate,
    get: vi.fn(),
    loading: false,
    error: null,
  }),
}));

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', firstName: 'Admin', lastName: 'User', role: 'ADMIN' },
    isSuperAdmin: false,
    selectedTenant: { id: 'tenant-1', name: 'Sunrise Care' },
    logout: vi.fn(),
    selectTenant: vi.fn(),
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <PractitionersPage />
    </MemoryRouter>,
  );
}

const mockPractitioner = {
  id: 'p-1',
  resourceType: 'Practitioner',
  active: true,
  name: [{ given: ['Jane'], family: 'Smith' }],
  gender: 'female',
  telecom: [
    { system: 'phone', value: '+44 7700 900001' },
    { system: 'email', value: 'jane@nhs.uk' },
  ],
  qualification: [
    {
      code: { text: 'General Practice' },
      identifier: [{ value: 'GMC 1234567' }],
    },
  ],
};

describe('PractitionersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({
      data: [mockPractitioner],
      total: 1,
      page: 1,
      limit: 20,
    });
  });

  it('renders the page header and add button', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Practitioners')).toBeInTheDocument();
    });
    expect(screen.getByText('Add Practitioner')).toBeInTheDocument();
  });

  it('loads and displays practitioners', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    expect(screen.getByText('General Practice')).toBeInTheDocument();
    expect(screen.getByText('+44 7700 900001')).toBeInTheDocument();
    expect(screen.getByText('jane@nhs.uk')).toBeInTheDocument();
    expect(screen.getByText('GMC 1234567')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows empty state when no practitioners', async () => {
    mockList.mockResolvedValueOnce({ data: [], total: 0, page: 1, limit: 20 });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no practitioners found/i)).toBeInTheDocument();
    });
  });

  it('opens create modal when Add Practitioner is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Practitioners')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Practitioner'));
    expect(screen.getByText('Add Practitioner', { selector: 'h2' })).toBeInTheDocument();
  });

  it('validates required fields in create modal', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Practitioners')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Practitioner'));

    // Save button should be disabled when form is empty
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    // Tab through required fields to trigger blur validation
    const labels = screen.getAllByText('First Name *');
    const firstNameInput = labels[labels.length - 1].parentElement?.querySelector(
      'input',
    ) as HTMLInputElement;
    firstNameInput.focus();
    await user.tab(); // blur first name → focus last name
    await user.tab(); // blur last name

    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('validates email format in create modal', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Practitioners')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Practitioner'));

    const emailInput = screen.getByPlaceholderText('doctor@nhs.uk');
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // trigger blur

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('creates a practitioner with valid data', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'p-new' });
    mockList.mockResolvedValue({ data: [mockPractitioner], total: 1, page: 1, limit: 20 });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Practitioners')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Practitioner'));

    const firstNameInputs = screen.getAllByDisplayValue('');
    // The modal has first name as the first text input
    await user.type(screen.getByPlaceholderText('doctor@nhs.uk'), 'test'); // just to identify inputs
    await user.clear(screen.getByPlaceholderText('doctor@nhs.uk'));

    // Find the inputs by label
    const labels = screen.getAllByText('First Name *');
    const firstNameLabel = labels[labels.length - 1]; // modal's label
    const firstNameInput = firstNameLabel.parentElement?.querySelector('input') as HTMLInputElement;
    const lastNameLabel = screen.getAllByText('Last Name *').pop()!;
    const lastNameInput = lastNameLabel.parentElement?.querySelector('input') as HTMLInputElement;

    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          givenName: 'John',
          familyName: 'Doe',
          userId: 'user-1',
        }),
      );
    });
  });

  it('opens edit modal when Edit button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Edit'));
    expect(screen.getByText('Edit Practitioner')).toBeInTheDocument();
    // Should be pre-filled
    expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
  });

  it('deactivates a practitioner', async () => {
    mockUpdate.mockResolvedValueOnce({ id: 'p-1', active: false });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Deactivate'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('p-1', { active: false });
    });
  });

  it('closes create modal on cancel', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Practitioners')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Add Practitioner'));
    expect(screen.getByText('Add Practitioner', { selector: 'h2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Add Practitioner', { selector: 'h2' })).not.toBeInTheDocument();
    });
  });
});
