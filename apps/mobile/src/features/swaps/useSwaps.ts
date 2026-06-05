import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api-client';
import { useAuth } from '../../auth/AuthContext';
import type { SwapRequest, ShiftListResponse, MyAssignmentOption } from '../../types';

interface UseSwaps {
  loading: boolean;
  error: string | null;
  mine: SwapRequest[];
  open: SwapRequest[];
  myShifts: MyAssignmentOption[];
  refresh: () => Promise<void>;
  createOffer: (assignmentId: string) => Promise<void>;
  respond: (swapId: string, assignmentId: string) => Promise<void>;
  cancel: (swapId: string) => Promise<void>;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Swap marketplace + the worker's own upcoming shifts (for the pickers). */
export function useSwaps(): UseSwaps {
  const { profile } = useAuth();
  const [mine, setMine] = useState<SwapRequest[]>([]);
  const [open, setOpen] = useState<SwapRequest[]>([]);
  const [myShifts, setMyShifts] = useState<MyAssignmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profile) return;
    setError(null);
    try {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 28);

      const [mineRes, openRes, shiftsRes] = await Promise.all([
        api.get<SwapRequest[]>('/swaps/mine'),
        api.get<SwapRequest[]>('/swaps'),
        api.get<ShiftListResponse>(`/shifts?from=${dateKey(from)}&to=${dateKey(to)}&limit=200`),
      ]);

      setMine(mineRes);
      // Hide my own offers from the "open to claim" list.
      setOpen(openRes.filter((s) => s.requester.id !== profile.id));

      const options: MyAssignmentOption[] = shiftsRes.data
        .map((shift) => {
          const a = shift.assignments.find((x) => x.user.id === profile.id);
          if (!a) return null;
          const p = shift.shiftPattern;
          return {
            assignmentId: a.id,
            date: shift.date.slice(0, 10),
            label: `${shift.date.slice(0, 10)} · ${p.name} (${p.startTime}–${p.endTime})`,
          };
        })
        .filter((x): x is MyAssignmentOption => x !== null)
        .sort((a, b) => a.date.localeCompare(b.date));
      setMyShifts(options);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const createOffer = useCallback(
    async (assignmentId: string) => {
      await api.post('/swaps', { originalShiftAssignmentId: assignmentId });
      await refresh();
    },
    [refresh],
  );

  const respond = useCallback(
    async (swapId: string, assignmentId: string) => {
      await api.post(`/swaps/${swapId}/respond`, { targetShiftAssignmentId: assignmentId });
      await refresh();
    },
    [refresh],
  );

  const cancel = useCallback(
    async (swapId: string) => {
      await api.post(`/swaps/${swapId}/cancel`, {});
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, error, mine, open, myShifts, refresh, createOffer, respond, cancel };
}
