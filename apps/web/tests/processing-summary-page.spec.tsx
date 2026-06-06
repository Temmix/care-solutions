import { render, screen, waitFor } from '@testing-library/react';
import { ProcessingSummaryPage } from '../src/features/settings/ProcessingSummaryPage';

const mockGet = vi.fn();
vi.mock('../src/lib/api-client', () => ({ api: { get: (p: string) => mockGet(p) } }));

let authValue: Record<string, unknown> = {
  currentRole: 'TENANT_ADMIN',
  isSuperAdmin: false,
  isTenantAdmin: true,
};
vi.mock('../src/hooks/use-auth', () => ({ useAuth: () => authValue }));

const SUMMARY = {
  purposes: [
    { purpose: 'DIRECT_CARE', count: 12 },
    { purpose: 'BILLING', count: 3 },
  ],
  article6Bases: [{ basis: 'PUBLIC_TASK', count: 15 }],
  consents: [{ type: 'RESEARCH', status: 'GRANTED', count: 4 }],
};

describe('ProcessingSummaryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authValue = { currentRole: 'TENANT_ADMIN', isSuperAdmin: false, isTenantAdmin: true };
    mockGet.mockResolvedValue(SUMMARY);
  });

  it('renders the three accountability sections with humanised labels and counts', async () => {
    render(<ProcessingSummaryPage />);

    await waitFor(() => expect(screen.getByText('By processing purpose')).toBeInTheDocument());
    expect(screen.getByText('Direct Care')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Public Task')).toBeInTheDocument();
    expect(screen.getByText('Research · Granted')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/privacy/processing-summary');
  });

  it('shows an access warning and does not fetch for non-admins', () => {
    authValue = { currentRole: 'NURSE', isSuperAdmin: false, isTenantAdmin: false };
    render(<ProcessingSummaryPage />);
    expect(screen.getByText(/administrator access to view/i)).toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalled();
  });
});
