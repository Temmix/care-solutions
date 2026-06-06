import { useCallback, useState } from 'react';
import { api } from '../../../lib/api-client';
import type { ShiftReportListResponse } from '../types';

export interface ShiftReportFilters {
  from?: string;
  to?: string;
  patientId?: string;
  locationId?: string;
  page?: number;
}

interface UseAdminShiftReports {
  data: ShiftReportListResponse | null;
  loading: boolean;
  error: string | null;
  fetchReports: (filters: ShiftReportFilters) => Promise<void>;
}

const LIMIT = 25;

/** Admin/tenant-admin view of every shift report in the tenant. */
export function useAdminShiftReports(): UseAdminShiftReports {
  const [data, setData] = useState<ShiftReportListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async (filters: ShiftReportFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(LIMIT));
      params.set('page', String(filters.page ?? 1));
      if (filters.from) params.set('from', new Date(filters.from).toISOString());
      if (filters.to) {
        // Include the whole "to" day.
        const end = new Date(filters.to);
        end.setHours(23, 59, 59, 999);
        params.set('to', end.toISOString());
      }
      if (filters.patientId) params.set('patientId', filters.patientId);
      if (filters.locationId) params.set('locationId', filters.locationId);

      const res = await api.get<ShiftReportListResponse>(`/shift-reports?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shift reports');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchReports };
}
