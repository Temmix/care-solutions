import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NotificationsPage } from '../src/features/notifications/NotificationsPage';

const mockGetNotifications = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../src/features/notifications/hooks/use-notifications', () => ({
  useNotifications: () => ({
    getNotifications: mockGetNotifications,
    markRead: mockMarkRead,
    markAllRead: mockMarkAllRead,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>,
  );
}

const baseNotification = {
  id: 'n1',
  read: false,
  readAt: null,
  createdAt: new Date().toISOString(),
  link: '/app/billing',
};

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNotifications.mockResolvedValue({
      data: [],
      total: 0,
      unreadCount: 0,
      page: 1,
      limit: 20,
    });
  });

  it('renders heading and unread count', async () => {
    mockGetNotifications.mockResolvedValue({
      data: [],
      total: 0,
      unreadCount: 3,
      page: 1,
      limit: 20,
    });

    renderPage();

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('3 unread')).toBeInTheDocument();
    });
  });

  it('shows empty state when no notifications', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });
  });

  it('renders notification with new type labels', async () => {
    mockGetNotifications.mockResolvedValue({
      data: [
        {
          ...baseNotification,
          id: 'n1',
          type: 'PATIENT_ADMITTED',
          title: 'John Doe admitted to Ward A',
          message: 'John Doe has been admitted',
        },
        {
          ...baseNotification,
          id: 'n2',
          type: 'SHIFT_SWAP_APPROVED',
          title: 'Your swap has been approved',
          message: 'Your swap was approved',
          read: true,
        },
        {
          ...baseNotification,
          id: 'n3',
          type: 'TRAINING_ASSIGNED',
          title: 'Fire Safety course assigned',
          message: 'You have been assigned training',
        },
        {
          ...baseNotification,
          id: 'n4',
          type: 'SUBSCRIPTION_CHANGED',
          title: 'Plan Updated',
          message: 'Your subscription changed',
        },
      ],
      total: 4,
      unreadCount: 3,
      page: 1,
      limit: 20,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('John Doe admitted to Ward A')).toBeInTheDocument();
    });

    // Check friendly type labels are rendered (uppercase small labels above titles)
    expect(screen.getByText('Patient Admitted')).toBeInTheDocument();
    expect(screen.getByText('Swap Approved')).toBeInTheDocument();
    expect(screen.getByText('Training Assigned')).toBeInTheDocument();
    expect(screen.getByText('Subscription')).toBeInTheDocument();
  });

  it('renders all new notification type labels correctly', async () => {
    const types = [
      { type: 'SHIFT_SWAP_NEEDS_APPROVAL', label: 'Swap Needs Approval' },
      { type: 'SHIFT_SWAP_REJECTED', label: 'Swap Rejected' },
      { type: 'SHIFT_SWAP_CANCELLED', label: 'Swap Cancelled' },
      { type: 'PATIENT_DISCHARGED', label: 'Patient Discharged' },
      { type: 'PATIENT_TRANSFERRED', label: 'Patient Transferred' },
      { type: 'TRAINING_EXPIRING', label: 'Training Expiring' },
      { type: 'TRIAL_EXPIRING', label: 'Trial Expiring' },
      { type: 'DEVICE_BATTERY_LOW', label: 'Device Battery' },
    ];

    for (const { type, label } of types) {
      vi.clearAllMocks();
      mockGetNotifications.mockResolvedValue({
        data: [
          {
            ...baseNotification,
            id: `n-${type}`,
            type,
            title: 'Test',
            message: 'Test message',
          },
        ],
        total: 1,
        unreadCount: 1,
        page: 1,
        limit: 20,
      });

      const { unmount } = renderPage();

      await waitFor(() => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('shows "Mark all read" button when there are unread notifications', async () => {
    mockGetNotifications.mockResolvedValue({
      data: [
        {
          ...baseNotification,
          type: 'PATIENT_ADMITTED',
          title: 'Patient Admitted',
          message: 'Test',
        },
      ],
      total: 1,
      unreadCount: 1,
      page: 1,
      limit: 20,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });
  });

  it('marks notification as read on click', async () => {
    mockMarkRead.mockResolvedValue({});
    mockGetNotifications.mockResolvedValue({
      data: [
        {
          ...baseNotification,
          type: 'TRAINING_ASSIGNED',
          title: 'New Training',
          message: 'You have training',
          link: '/app/training',
        },
      ],
      total: 1,
      unreadCount: 1,
      page: 1,
      limit: 20,
    });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('New Training')).toBeInTheDocument();
    });

    await user.click(screen.getByText('New Training'));

    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith('n1');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/app/training');
  });

  it('has link to preferences page', async () => {
    renderPage();

    const link = screen.getByText('Preferences');
    expect(link.closest('a')).toHaveAttribute('href', '/app/settings/notifications');
  });

  it('calls markAllRead when button clicked', async () => {
    mockMarkAllRead.mockResolvedValue({ count: 2 });
    mockGetNotifications.mockResolvedValue({
      data: [
        {
          ...baseNotification,
          type: 'WELCOME',
          title: 'Welcome',
          message: 'Welcome to Clinvara',
        },
      ],
      total: 1,
      unreadCount: 1,
      page: 1,
      limit: 20,
    });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Mark all read'));

    await waitFor(() => {
      expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
    });
  });
});
