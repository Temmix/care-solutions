import { renderHook, act, waitFor } from '@testing-library/react';
import { useShiftReports } from '../src/features/reports/hooks/use-shift-reports';

vi.mock('../src/lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

import { api } from '../src/lib/api-client';

const mockedApi = vi.mocked(api);

const onShiftContext = {
  onShift: true,
  shiftAssignmentId: 'sa-1',
  shift: {
    id: 's-1',
    date: '2026-06-06',
    pattern: { name: 'Day', startTime: '08:00', endTime: '20:00' },
  },
  location: { id: 'loc-1', name: 'Ward A', type: 'WARD' },
  reportingClosesAt: '2026-06-06T21:00:00.000Z',
  patients: [{ patientId: 'p-1', name: 'Jane Doe', encounterId: 'e-1', bedId: 'b-1', bed: '1A' }],
};

const reportList = {
  data: [
    {
      id: 'r-1',
      category: 'PERSONAL_CARE',
      priority: 'NORMAL',
      content: 'All washed and dressed',
      patientId: 'p-1',
      recordedAt: '2026-06-06T09:00:00.000Z',
      patient: { id: 'p-1', givenName: 'Jane', familyName: 'Doe' },
    },
  ],
  total: 1,
  page: 1,
  limit: 50,
};

describe('useShiftReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads context and the open shift's reports on mount", async () => {
    mockedApi.get.mockResolvedValueOnce(onShiftContext).mockResolvedValueOnce(reportList);

    const { result } = renderHook(() => useShiftReports());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/shift-reports/context');
    expect(mockedApi.get).toHaveBeenNthCalledWith(
      2,
      '/shift-reports?shiftAssignmentId=sa-1&limit=50',
    );
    expect(result.current.context?.onShift).toBe(true);
    expect(result.current.recent).toHaveLength(1);
  });

  it('does not fetch reports when the worker is not on shift', async () => {
    mockedApi.get.mockResolvedValueOnce({ onShift: false });

    const { result } = renderHook(() => useShiftReports());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(result.current.recent).toEqual([]);
  });

  it('submits a report with the current shift assignment then refreshes', async () => {
    mockedApi.get.mockResolvedValueOnce(onShiftContext).mockResolvedValueOnce(reportList);
    const { result } = renderHook(() => useShiftReports());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.post.mockResolvedValueOnce({ id: 'r-2' });
    mockedApi.get.mockResolvedValueOnce(onShiftContext).mockResolvedValueOnce(reportList);

    await act(async () => {
      await result.current.submit({
        patientId: 'p-1',
        category: 'INCIDENT',
        priority: 'CONCERN',
        content: 'Minor fall, no injury',
      });
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/shift-reports', {
      shiftAssignmentId: 'sa-1',
      patientId: 'p-1',
      category: 'INCIDENT',
      priority: 'CONCERN',
      content: 'Minor fall, no injury',
    });
    // refresh re-runs context + list
    expect(mockedApi.get).toHaveBeenCalledTimes(4);
  });

  it('does not submit when there is no open shift', async () => {
    mockedApi.get.mockResolvedValueOnce({ onShift: false });
    const { result } = renderHook(() => useShiftReports());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submit({
        patientId: 'p-1',
        category: 'GENERAL_NOTE',
        priority: 'NORMAL',
        content: 'noop',
      });
    });

    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('surfaces an error when the context request fails', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useShiftReports());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network error');
  });
});
