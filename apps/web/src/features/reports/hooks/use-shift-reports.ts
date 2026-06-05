import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/api-client';
import type { ShiftContext, ShiftReport, ShiftReportListResponse, NewShiftReport } from '../types';

interface UseShiftReports {
  loading: boolean;
  error: string | null;
  context: ShiftContext | null;
  recent: ShiftReport[];
  refresh: () => Promise<void>;
  submit: (input: NewShiftReport) => Promise<void>;
}

/**
 * Worker-facing shift reporting on web — mirrors the mobile hook but without the
 * offline queue (the browser submits straight through). Loads the current open
 * shift context and the reports the worker has already filed against it.
 */
export function useShiftReports(): UseShiftReports {
  const [context, setContext] = useState<ShiftContext | null>(null);
  const [recent, setRecent] = useState<ShiftReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const ctx = await api.get<ShiftContext>('/shift-reports/context');
      setContext(ctx);
      if (ctx.onShift && ctx.shiftAssignmentId) {
        const res = await api.get<ShiftReportListResponse>(
          `/shift-reports?shiftAssignmentId=${ctx.shiftAssignmentId}&limit=50`,
        );
        setRecent(res.data);
      } else {
        setRecent([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shift reports');
    } finally {
      setLoading(false);
    }
  }, []);

  const submit = useCallback(
    async (input: NewShiftReport) => {
      const shiftAssignmentId = context?.shiftAssignmentId;
      if (!shiftAssignmentId) return;
      await api.post('/shift-reports', {
        shiftAssignmentId,
        patientId: input.patientId,
        category: input.category,
        priority: input.priority,
        content: input.content,
      });
      await refresh();
    },
    [context, refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, error, context, recent, refresh, submit };
}
