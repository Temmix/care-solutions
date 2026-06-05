import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../../lib/api-client';
import type {
  ShiftContext,
  ShiftReport,
  ShiftReportCategory,
  ShiftReportPriority,
  ShiftReportListResponse,
} from '../../types';
import {
  enqueue,
  flush,
  getPending,
  getFailed,
  subscribe,
  uuidv4,
  type QueuedReport,
  type FailedReport,
} from './report-queue';

export interface NewReport {
  patientId: string;
  category: ShiftReportCategory;
  priority: ShiftReportPriority;
  content: string;
}

interface UseShiftReports {
  loading: boolean;
  error: string | null;
  context: ShiftContext | null;
  recent: ShiftReport[];
  pending: QueuedReport[];
  failed: FailedReport[];
  refresh: () => Promise<void>;
  submit: (input: NewReport) => Promise<void>;
  syncNow: () => Promise<void>;
}

export function useShiftReports(): UseShiftReports {
  const [context, setContext] = useState<ShiftContext | null>(null);
  const [recent, setRecent] = useState<ShiftReport[]>([]);
  const [pending, setPending] = useState<QueuedReport[]>([]);
  const [failed, setFailed] = useState<FailedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadQueue = useCallback(async () => {
    const [p, f] = await Promise.all([getPending(), getFailed()]);
    setPending(p);
    setFailed(f);
  }, []);

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
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncNow = useCallback(async () => {
    await flush();
    await reloadQueue();
    await refresh();
  }, [reloadQueue, refresh]);

  const submit = useCallback(
    async (input: NewReport) => {
      const shiftAssignmentId = context?.shiftAssignmentId;
      if (!shiftAssignmentId) return;
      const report: QueuedReport = {
        clientEventId: uuidv4(),
        shiftAssignmentId,
        patientId: input.patientId,
        category: input.category,
        priority: input.priority,
        content: input.content,
        capturedAt: new Date().toISOString(),
      };
      await enqueue(report);
      await syncNow();
    },
    [context, syncNow],
  );

  useEffect(() => {
    void refresh();
    void reloadQueue();
  }, [refresh, reloadQueue]);

  useEffect(() => {
    const unsub = subscribe(() => {
      void reloadQueue();
    });
    const netUnsub = NetInfo.addEventListener((s) => {
      if (s.isConnected && s.isInternetReachable !== false) void syncNow();
    });
    return () => {
      unsub();
      netUnsub();
    };
  }, [reloadQueue, syncNow]);

  return { loading, error, context, recent, pending, failed, refresh, submit, syncNow };
}
