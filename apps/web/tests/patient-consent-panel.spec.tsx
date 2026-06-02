import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientConsentPanel } from '../src/features/patients/components/PatientConsentPanel';

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock('../src/lib/api-client', () => ({
  api: {
    get: (path: string) => mockGet(path),
    put: (path: string, body: unknown) => mockPut(path, body),
  },
}));

let authValue: Record<string, unknown> = {
  currentRole: 'CLINICIAN',
  isSuperAdmin: false,
  isTenantAdmin: false,
};
vi.mock('../src/hooks/use-auth', () => ({ useAuth: () => authValue }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const PID = 'pat-1';

const setData = (bases: unknown[], consents: unknown[]) => {
  mockGet.mockImplementation((path: string) =>
    Promise.resolve(path.includes('processing-bases') ? bases : consents),
  );
};

function renderPanel() {
  return render(<PatientConsentPanel patientId={PID} />);
}

describe('PatientConsentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authValue = { currentRole: 'CLINICIAN', isSuperAdmin: false, isTenantAdmin: false };
    setData([], []);
    mockPut.mockResolvedValue({});
  });

  it('renders nothing for roles without access (e.g. CARER)', () => {
    authValue = { currentRole: 'CARER', isSuperAdmin: false, isTenantAdmin: false };
    const { container } = renderPanel();
    expect(container).toBeEmptyDOMElement();
  });

  it('loads and shows lawful bases and consent types', async () => {
    setData(
      [
        {
          id: 'b1',
          purpose: 'DIRECT_CARE',
          article6Basis: 'PUBLIC_TASK',
          article9Condition: 'HEALTH_OR_SOCIAL_CARE',
          notes: null,
        },
      ],
      [{ id: 'c1', type: 'DATA_SHARING', status: 'GRANTED', grantedAt: 'x', withdrawnAt: null }],
    );
    renderPanel();

    await waitFor(() => expect(screen.getByText(/Art\. 6: Public Task/)).toBeInTheDocument());
    expect(screen.getByText('Granted')).toBeInTheDocument();
    expect(screen.getByText('Data Sharing')).toBeInTheDocument(); // a consent type
    expect(mockGet).toHaveBeenCalledWith(`/privacy/patients/${PID}/processing-bases`);
    expect(mockGet).toHaveBeenCalledWith(`/privacy/patients/${PID}/consents`);
  });

  it('saves a lawful basis via PUT', async () => {
    renderPanel();
    await waitFor(() => screen.getByText('Save basis'));

    await userEvent.click(screen.getByText('Save basis'));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        `/privacy/patients/${PID}/processing-bases`,
        expect.objectContaining({ purpose: 'DIRECT_CARE', article6Basis: 'PUBLIC_TASK' }),
      );
    });
  });

  it('grants a not-recorded consent and withdraws a granted one', async () => {
    setData(
      [],
      [{ id: 'c1', type: 'DATA_SHARING', status: 'GRANTED', grantedAt: 'x', withdrawnAt: null }],
    );
    renderPanel();
    await waitFor(() => screen.getByText('Data Sharing'));

    // Research is not recorded → Grant ("Research" also appears as a <select>
    // option, so pick the occurrence inside a consent list item).
    const researchSpan = screen
      .getAllByText('Research')
      .find((el) => el.closest('li')) as HTMLElement;
    const researchRow = researchSpan.closest('li') as HTMLElement;
    await userEvent.click(within(researchRow).getByRole('button', { name: /grant/i }));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(`/privacy/patients/${PID}/consents`, {
        type: 'RESEARCH',
        status: 'GRANTED',
      });
    });

    // Data Sharing is granted → Withdraw
    const sharingRow = screen.getByText('Data Sharing').closest('li') as HTMLElement;
    await userEvent.click(within(sharingRow).getByRole('button', { name: /withdraw/i }));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(`/privacy/patients/${PID}/consents`, {
        type: 'DATA_SHARING',
        status: 'WITHDRAWN',
      });
    });
  });
});
