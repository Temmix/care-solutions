import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ShiftReportsPage } from '../src/features/reports/ShiftReportsPage';

const mockGet = vi.fn();
vi.mock('../src/lib/api-client', () => ({ api: { get: (p: string) => mockGet(p) } }));

const makeResult = (overrides = {}) => ({
  data: [
    {
      id: 'r-1',
      category: 'INCIDENT',
      priority: 'URGENT',
      content: 'Patient had a fall in the bathroom',
      patientId: 'p-1',
      recordedAt: '2026-06-06T12:30:00.000Z',
      patient: { id: 'p-1', givenName: 'Jane', familyName: 'Doe' },
      location: { id: 'loc-1', name: 'Ward A', type: 'WARD' },
      bed: { id: 'b-1', identifier: 'Bed 1' },
      recordedBy: { id: 'u-1', firstName: 'Sarah', lastName: 'Smith', role: 'NURSE' },
    },
  ],
  total: 1,
  page: 1,
  limit: 25,
  ...overrides,
});

describe('ShiftReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(makeResult());
  });

  it('lists reports with patient, category, priority and staff', async () => {
    render(<ShiftReportsPage />);

    await waitFor(() => expect(screen.getByText(/Jane Doe/)).toBeInTheDocument());
    expect(screen.getByText('Incident')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('Patient had a fall in the bathroom')).toBeInTheDocument();
    expect(screen.getByText('Sarah Smith')).toBeInTheDocument();
    // Bed identifier is shown as-is, not double-prefixed ("Bed Bed 1").
    expect(screen.getByText(/· Bed 1/)).toBeInTheDocument();
    expect(screen.queryByText(/Bed Bed 1/)).not.toBeInTheDocument();
  });

  it('requests the first page with a default limit on mount', async () => {
    render(<ShiftReportsPage />);

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('/shift-reports?');
    expect(url).toContain('limit=25');
    expect(url).toContain('page=1');
  });

  it('passes date and patient filters into the query', async () => {
    render(<ShiftReportsPage />);
    await waitFor(() => expect(screen.getByText(/Jane Doe/)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Filter by patient ID'), {
      target: { value: 'p-1' },
    });

    await waitFor(() => {
      const url = mockGet.mock.calls.at(-1)?.[0] as string;
      expect(url).toContain('patientId=p-1');
    });
  });

  it('shows an empty state when there are no reports', async () => {
    mockGet.mockResolvedValue(makeResult({ data: [], total: 0 }));
    render(<ShiftReportsPage />);

    await waitFor(() =>
      expect(
        screen.getByText('No shift reports found for the selected filters.'),
      ).toBeInTheDocument(),
    );
  });
});
