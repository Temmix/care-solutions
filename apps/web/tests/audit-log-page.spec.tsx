import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuditLogPage } from '../src/features/audit/AuditLogPage';

const mockGet = vi.fn();
vi.mock('../src/lib/api-client', () => ({ api: { get: (p: string) => mockGet(p) } }));

const RESULT = {
  data: [
    {
      id: 'l1',
      userId: 'u1',
      action: 'VIEW',
      resource: 'Patient',
      resourceId: 'pat-1-uuid',
      metadata: { route: '/api/patients/:id' },
      createdAt: '2026-06-03T11:45:07.000Z',
      user: { firstName: 'Sarah', lastName: 'Smith', email: 'sarah@x.test' },
      patientId: 'pat-1-uuid',
      patientName: 'Jane Doe',
    },
    {
      id: 'l2',
      userId: 'u1',
      action: 'EXPORT',
      resource: 'CarePlan',
      resourceId: 'cp-1-uuid',
      metadata: { route: '/api/care-plans/:id' },
      createdAt: '2026-06-03T09:00:00.000Z',
      user: { firstName: 'Sarah', lastName: 'Smith', email: 'sarah@x.test' },
      patientId: 'pat-2-uuid',
      patientName: 'John Roe',
    },
  ],
  total: 2,
  page: 1,
  limit: 25,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <AuditLogPage />
    </MemoryRouter>,
  );

describe('AuditLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(RESULT);
  });

  it('shows human-readable actions and the resolved patient subject', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    // Action codes are humanised (table cells, not the filter <option>s)
    expect(screen.getByRole('cell', { name: 'Viewed' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Exported (DSAR)' })).toBeInTheDocument();
    // Patient-linked CarePlan view names the patient + resource label
    expect(screen.getByText('John Roe')).toBeInTheDocument();
    expect(screen.getByText(/· Care Plan/)).toBeInTheDocument();
    // Patient subject links to the patient record
    expect(screen.getByText('Jane Doe').closest('a')).toHaveAttribute(
      'href',
      '/app/patients/pat-1-uuid',
    );
  });

  it('reveals full forensic detail (raw action, UUID, email, route) when a row is expanded', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());

    // Detail is hidden until the row is clicked
    expect(screen.queryByText(/sarah@x\.test/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('cell', { name: 'Viewed' }));

    expect(screen.getByText(/sarah@x\.test/)).toBeInTheDocument();
    // raw resourceId surfaced (== patientId here, so it appears in both rows)
    expect(screen.getAllByText('pat-1-uuid').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('/api/patients/:id')).toBeInTheDocument(); // route
  });

  it('passes the action filter through to the API query', async () => {
    renderPage();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'EXPORT' } });

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('action=EXPORT')),
    );
  });
});
