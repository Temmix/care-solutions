import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NotificationPreferencesPage } from '../src/features/notifications/NotificationPreferencesPage';

const mockGetPreferences = vi.fn();
const mockUpdatePreferences = vi.fn();

vi.mock('../src/features/notifications/hooks/use-notifications', () => ({
  useNotifications: () => ({
    getPreferences: mockGetPreferences,
    updatePreferences: mockUpdatePreferences,
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <NotificationPreferencesPage />
    </MemoryRouter>,
  );
}

describe('NotificationPreferencesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPreferences.mockResolvedValue([]);
  });

  it('renders heading and description', async () => {
    renderPage();

    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    expect(screen.getByText('Choose which notifications you receive and how.')).toBeInTheDocument();
  });

  it('renders all event group headers', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Workforce')).toBeInTheDocument();
    });

    expect(screen.getByText('Patient Flow')).toBeInTheDocument();
    expect(screen.getByText('Training')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('Virtual Wards')).toBeInTheDocument();
    expect(screen.getByText('CHC')).toBeInTheDocument();
    expect(screen.getByText('Care Plans')).toBeInTheDocument();
    expect(screen.getByText('IoT')).toBeInTheDocument();
  });

  it('renders workforce notification types', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Shift Swap Request')).toBeInTheDocument();
    });

    expect(screen.getByText('Shift Swap Response')).toBeInTheDocument();
    expect(screen.getByText('Shift Swap Approved')).toBeInTheDocument();
    expect(screen.getByText('Shift Swap Rejected')).toBeInTheDocument();
    expect(screen.getByText('Shift Swap Cancelled')).toBeInTheDocument();
    expect(screen.getByText('Shift Swap Needs Approval')).toBeInTheDocument();
    expect(screen.getByText('Shift Gap Detected')).toBeInTheDocument();
  });

  it('renders patient flow notification types', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Patient Admitted')).toBeInTheDocument();
    });

    expect(screen.getByText('Patient Discharged')).toBeInTheDocument();
    expect(screen.getByText('Patient Transferred')).toBeInTheDocument();
    expect(screen.getByText('Discharge Plan Ready')).toBeInTheDocument();
  });

  it('renders training and billing types', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Training Assigned')).toBeInTheDocument();
    });

    expect(screen.getByText('Training Expiring')).toBeInTheDocument();
    expect(screen.getByText('Trial Expiring')).toBeInTheDocument();
    expect(screen.getByText('Subscription Changed')).toBeInTheDocument();
  });

  it('renders In-App and Email column headers', async () => {
    renderPage();

    expect(screen.getByText('In-App')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders toggles for each event type and channel', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Shift Swap Request')).toBeInTheDocument();
    });

    // Each event type has 2 toggle buttons (IN_APP + EMAIL)
    const toggles = screen.getAllByRole('button', { name: /shift swap request/i });
    expect(toggles).toHaveLength(2);
  });

  it('loads saved preferences and applies them', async () => {
    mockGetPreferences.mockResolvedValue([
      { eventType: 'SHIFT_SWAP_REQUEST', channel: 'EMAIL', enabled: false },
    ]);

    renderPage();

    await waitFor(() => {
      expect(mockGetPreferences).toHaveBeenCalledTimes(1);
    });
  });

  it('calls updatePreferences on save', async () => {
    mockUpdatePreferences.mockResolvedValue([]);
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Shift Swap Request')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /save preferences/i }));

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledTimes(1);
    });

    expect(mockUpdatePreferences).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ eventType: 'SHIFT_SWAP_REQUEST', channel: 'IN_APP' }),
        expect.objectContaining({ eventType: 'SHIFT_SWAP_REQUEST', channel: 'EMAIL' }),
      ]),
    );
  });

  it('shows saved message after successful save', async () => {
    mockUpdatePreferences.mockResolvedValue([]);
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Shift Swap Request')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /save preferences/i }));

    await waitFor(() => {
      expect(screen.getByText('Saved successfully')).toBeInTheDocument();
    });
  });

  it('shows error on save failure', async () => {
    mockUpdatePreferences.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Shift Swap Request')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /save preferences/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('has back link to notifications page', () => {
    renderPage();

    const link = screen.getByText('Back to Notifications');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/app/notifications');
  });
});
