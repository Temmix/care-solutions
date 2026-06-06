import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { OnShiftReportCard } from '../src/features/reports/OnShiftReportCard';

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('../src/lib/api-client', () => ({
  api: { get: (p: string) => mockGet(p), post: (p: string, b: unknown) => mockPost(p, b) },
}));

const onShiftContext = {
  onShift: true,
  shiftAssignmentId: 'sa-1',
  shift: {
    id: 's-1',
    date: '2026-06-06',
    pattern: { name: 'Day', startTime: '08:00', endTime: '20:00' },
  },
  location: { id: 'loc-1', name: 'Ward A', type: 'WARD' },
  patients: [{ patientId: 'p-1', name: 'Jane Doe', encounterId: 'e-1', bedId: 'b-1', bed: '1A' }],
};

const reportList = {
  data: [
    {
      id: 'r-1',
      category: 'PERSONAL_CARE',
      priority: 'CONCERN',
      content: 'Reduced appetite at lunch',
      patientId: 'p-1',
      recordedAt: '2026-06-06T12:30:00.000Z',
      patient: { id: 'p-1', givenName: 'Jane', familyName: 'Doe' },
    },
  ],
  total: 1,
  page: 1,
  limit: 50,
};

describe('OnShiftReportCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when the worker is not on shift', async () => {
    mockGet.mockResolvedValueOnce({ onShift: false });
    const { container } = render(<OnShiftReportCard />);

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the card and recent reports when on shift', async () => {
    mockGet.mockResolvedValueOnce(onShiftContext).mockResolvedValueOnce(reportList);
    render(<OnShiftReportCard />);

    await waitFor(() => expect(screen.getByText('Care reporting')).toBeInTheDocument());
    expect(screen.getByText('Ward A · Day')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Reduced appetite at lunch')).toBeInTheDocument();
    // Non-normal priority gets a badge
    expect(screen.getByText('Concern')).toBeInTheDocument();
  });

  it('opens the report modal with the location patients', async () => {
    mockGet.mockResolvedValueOnce(onShiftContext).mockResolvedValueOnce(reportList);
    render(<OnShiftReportCard />);

    await waitFor(() => expect(screen.getByText('Care reporting')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'New report' }));

    expect(screen.getByText('Who is this report about?')).toBeInTheDocument();
    // patient appears both in the recent list and the modal picker
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(1);
  });
});
