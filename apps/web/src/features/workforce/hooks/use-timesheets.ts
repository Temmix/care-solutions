import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

export interface TimesheetRecord {
  id: string;
  status: 'CLOCKED_IN' | 'CLOCKED_OUT' | 'MISSED' | 'AUTO_CLOCKED_OUT';
  clockInAt: string;
  clockInDistance: number | null;
  clockOutAt: string | null;
  autoClockOut: boolean;
  notes: string | null;
  user: { id: string; firstName: string; lastName: string; email: string };
  shiftAssignment: {
    id: string;
    shift: {
      id: string;
      date: string;
      shiftPattern: { name: string; startTime: string; endTime: string };
      location: { id: string; name: string } | null;
    };
  };
  flags: { late: boolean; lateMinutes: number; autoClockOut: boolean };
  durationMinutes: number | null;
}

export interface TimesheetResponse {
  items: TimesheetRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TimesheetQuery {
  from: string;
  to: string;
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useTimesheets(): {
  data: TimesheetResponse | null;
  loading: boolean;
  error: string | null;
  fetchTimesheets: (query: TimesheetQuery) => Promise<void>;
} {
  const [data, setData] = useState<TimesheetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimesheets = useCallback(async (query: TimesheetQuery) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: query.from, to: query.to });
      if (query.userId) params.set('userId', query.userId);
      if (query.status) params.set('status', query.status);
      if (query.page) params.set('page', String(query.page));
      if (query.limit) params.set('limit', String(query.limit));

      const result = await api.get<TimesheetResponse>(`/timesheets?${params}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchTimesheets };
}
