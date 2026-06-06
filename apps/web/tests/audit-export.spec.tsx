import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuditLogPage } from '../src/features/audit/AuditLogPage';

const mockGet = vi.fn();
const mockGetText = vi.fn();
vi.mock('../src/lib/api-client', () => ({
  api: { get: (p: string) => mockGet(p), getText: (p: string) => mockGetText(p) },
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <AuditLogPage />
    </MemoryRouter>,
  );

describe('AuditLogPage — CSV export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: [], total: 3, page: 1, limit: 25 });
    mockGetText.mockResolvedValue('"Timestamp","User"\n"2026-06-03","Sarah Smith"');
    // jsdom has no object-URL support
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
  });

  it('downloads CSV from the export endpoint, carrying the active filters', async () => {
    renderPage();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'EXPORT' } });
    fireEvent.click(screen.getByRole('button', { name: /Export CSV/i }));

    await waitFor(() => expect(mockGetText).toHaveBeenCalled());
    const path = mockGetText.mock.calls[0][0] as string;
    expect(path).toContain('/audit/logs/export');
    expect(path).toContain('action=EXPORT');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('keeps the Compliance Dashboard link alongside Export', async () => {
    renderPage();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Compliance Dashboard/i })).toBeInTheDocument();
  });

  it('disables Export when there are no records', async () => {
    mockGet.mockResolvedValue({ data: [], total: 0, page: 1, limit: 25 });
    renderPage();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeDisabled();
  });
});
