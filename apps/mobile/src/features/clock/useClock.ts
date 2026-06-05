import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../../lib/api-client';
import type { TodayAssignment } from '../../types';
import {
  enqueue,
  flush,
  getPending,
  getFailed,
  subscribe,
  uuidv4,
  type QueuedClockEvent,
  type FailedClockEvent,
} from './offline-queue';
import type { Coords } from './useGeolocation';

export type AssignmentClockState = 'not_clocked_in' | 'clocked_in' | 'clocked_out';

export interface AssignmentView {
  assignment: TodayAssignment;
  state: AssignmentClockState;
  /** A queued-but-unsynced action for this assignment, if any. */
  pendingKind: 'in' | 'out' | null;
}

interface UseClock {
  loading: boolean;
  error: string | null;
  views: AssignmentView[];
  pending: QueuedClockEvent[];
  failed: FailedClockEvent[];
  online: boolean;
  refresh: () => Promise<void>;
  clockIn: (assignmentId: string, coords: Coords) => Promise<void>;
  clockOut: (assignmentId: string, coords: Coords | null, notes?: string) => Promise<void>;
  syncNow: () => Promise<void>;
}

export function useClock(): UseClock {
  const [assignments, setAssignments] = useState<TodayAssignment[]>([]);
  const [pending, setPending] = useState<QueuedClockEvent[]>([]);
  const [failed, setFailed] = useState<FailedClockEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  const reloadQueue = useCallback(async () => {
    const [p, f] = await Promise.all([getPending(), getFailed()]);
    setPending(p);
    setFailed(f);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<TodayAssignment[]>('/shifts/my-today');
      setAssignments(data);
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

  const clockIn = useCallback(
    async (assignmentId: string, coords: Coords) => {
      const event: QueuedClockEvent = {
        clientEventId: uuidv4(),
        kind: 'in',
        shiftAssignmentId: assignmentId,
        capturedAt: new Date().toISOString(),
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
      await enqueue(event);
      await syncNow();
    },
    [syncNow],
  );

  const clockOut = useCallback(
    async (assignmentId: string, coords: Coords | null, notes?: string) => {
      const event: QueuedClockEvent = {
        clientEventId: uuidv4(),
        kind: 'out',
        shiftAssignmentId: assignmentId,
        capturedAt: new Date().toISOString(),
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        notes,
      };
      await enqueue(event);
      await syncNow();
    },
    [syncNow],
  );

  // Initial load.
  useEffect(() => {
    void refresh();
    void reloadQueue();
  }, [refresh, reloadQueue]);

  // Keep queue counts live, and auto-flush when connectivity returns.
  useEffect(() => {
    const unsub = subscribe(() => {
      void reloadQueue();
    });
    const netUnsub = NetInfo.addEventListener((s) => {
      const isOnline = Boolean(s.isConnected && s.isInternetReachable !== false);
      setOnline(isOnline);
      if (isOnline) void syncNow();
    });
    return () => {
      unsub();
      netUnsub();
    };
  }, [reloadQueue, syncNow]);

  const views: AssignmentView[] = assignments.map((assignment) => {
    const queued = pending.find((p) => p.shiftAssignmentId === assignment.id);
    let state: AssignmentClockState = 'not_clocked_in';
    if (assignment.clockRecord) {
      state = assignment.clockRecord.status === 'CLOCKED_IN' ? 'clocked_in' : 'clocked_out';
    }
    // Overlay optimistic state from unsynced events.
    if (queued?.kind === 'in') state = 'clocked_in';
    if (queued?.kind === 'out') state = 'clocked_out';
    return { assignment, state, pendingKind: queued?.kind ?? null };
  });

  return {
    loading,
    error,
    views,
    pending,
    failed,
    online,
    refresh,
    clockIn,
    clockOut,
    syncNow,
  };
}
