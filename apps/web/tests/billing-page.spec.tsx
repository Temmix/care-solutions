import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BillingPage } from '../src/features/billing/BillingPage';

const mockGetPlans = vi.fn();
const mockGetSubscription = vi.fn();
const mockCreateCheckout = vi.fn();
const mockOpenPortal = vi.fn();

vi.mock('../src/features/billing/hooks/use-billing', () => ({
  useBilling: () => ({
    getPlans: mockGetPlans,
    getSubscription: mockGetSubscription,
    createCheckout: mockCreateCheckout,
    openPortal: mockOpenPortal,
    loading: false,
    error: null,
  }),
}));

let mockAuthState = {
  user: { id: 'user-1', firstName: 'Sarah', lastName: 'Mitchell', role: 'ADMIN' },
  isSuperAdmin: false,
  selectedTenant: { id: 'tenant-1', name: 'Sunrise Care', type: 'CARE_HOME' },
  logout: vi.fn(),
  selectTenant: vi.fn(),
};

vi.mock('../src/hooks/use-auth', () => ({
  useAuth: () => mockAuthState,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <BillingPage />
    </MemoryRouter>,
  );
}

const mockPlans = [
  {
    tier: 'FREE',
    label: 'Free',
    priceMonthlyGBP: 0,
    patientLimit: 5,
    userLimit: 1,
    priceId: null,
  },
  {
    tier: 'STARTER',
    label: 'Starter',
    priceMonthlyGBP: 59,
    patientLimit: 200,
    userLimit: 20,
    priceId: 'price_starter',
  },
  {
    tier: 'PROFESSIONAL',
    label: 'Professional',
    priceMonthlyGBP: 99,
    patientLimit: 500,
    userLimit: 50,
    priceId: 'price_pro',
  },
  {
    tier: 'ENTERPRISE',
    label: 'Enterprise',
    priceMonthlyGBP: 299,
    patientLimit: -1,
    userLimit: -1,
    priceId: 'price_enterprise',
  },
];

const mockSubscription = {
  id: 'sub-1',
  organizationId: 'tenant-1',
  tier: 'STARTER',
  status: 'ACTIVE',
  stripeSubscriptionId: 'sub_stripe_1',
  currentPeriodEnd: '2026-04-12T00:00:00Z',
  cancelAtPeriodEnd: false,
  patientLimit: 200,
  userLimit: 20,
  limits: { patientLimit: 200, userLimit: 20, label: 'Starter', priceMonthlyGBP: 59 },
  organization: { name: 'Sunrise Care', stripeCustomerId: 'cus_test' },
};

describe('BillingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlans.mockResolvedValue(mockPlans);
    mockGetSubscription.mockResolvedValue(mockSubscription);
    mockAuthState = {
      user: { id: 'user-1', firstName: 'Sarah', lastName: 'Mitchell', role: 'ADMIN' },
      isSuperAdmin: false,
      selectedTenant: { id: 'tenant-1', name: 'Sunrise Care', type: 'CARE_HOME' },
      logout: vi.fn(),
      selectTenant: vi.fn(),
    };
  });

  it('renders the page header', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Billing & Subscription')).toBeInTheDocument();
    });
  });

  it('displays current subscription info', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Current Plan', { selector: 'h2' })).toBeInTheDocument();
    });
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Manage Billing')).toBeInTheDocument();
  });

  it('displays available plans (excludes FREE tier)', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Available Plans')).toBeInTheDocument();
    });
    // Starter appears in both subscription card and plan grid
    expect(screen.getAllByText('Starter').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
    // FREE plan should not appear in the plans grid
    expect(screen.queryByText('5 patients')).not.toBeInTheDocument();
  });

  it('marks current plan', async () => {
    renderPage();

    await waitFor(() => {
      // "Current Plan" appears as h2 header and as label in the plan grid
      expect(screen.getAllByText('Current Plan').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows renewal date', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/renews on/i)).toBeInTheDocument();
    });
  });

  it('shows cancellation date when cancelAtPeriodEnd is true', async () => {
    mockGetSubscription.mockResolvedValueOnce({
      ...mockSubscription,
      cancelAtPeriodEnd: true,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/cancels on/i)).toBeInTheDocument();
    });
  });

  it('shows tenant selection prompt for SUPER_ADMIN without tenant', async () => {
    mockAuthState = {
      ...mockAuthState,
      isSuperAdmin: true,
      selectedTenant: null,
    } as typeof mockAuthState;
    renderPage();

    expect(screen.getByText('Select a Tenant First')).toBeInTheDocument();
  });

  it('shows plan prices', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Available Plans')).toBeInTheDocument();
    });
    expect(screen.getByText('£59')).toBeInTheDocument();
    expect(screen.getByText('£99')).toBeInTheDocument();
    expect(screen.getByText('£299')).toBeInTheDocument();
  });

  it('shows patient and user limits for each plan (excludes FREE)', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Available Plans')).toBeInTheDocument();
    });
    // FREE plan (5 patients) should not appear
    expect(screen.queryByText('5 patients')).not.toBeInTheDocument();
    // 200 patients may appear in both subscription card and plan card
    expect(screen.getAllByText('200 patients').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('500 patients')).toBeInTheDocument();
    expect(screen.getByText('Unlimited patients')).toBeInTheDocument();
  });
});
