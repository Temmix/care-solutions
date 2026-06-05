import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api-client';
import { useAuth } from '../../auth/AuthContext';
import type { RosterShift, ShiftListResponse } from '../../types';

export interface ShiftDayGroup {
  /** YYYY-MM-DD (the shift's calendar day). */
  date: string;
  /** e.g. "Fri 5 Jun" — or "Today" / "Tomorrow". */
  label: string;
  shifts: RosterShift[];
}

const DAYS_AHEAD = 28; // four weeks

/**
 * YYYY-MM-DD from the date's LOCAL calendar parts (not UTC). Using toISOString
 * here would return the UTC day, which in timezones ahead of UTC (e.g. BST)
 * shifts back a day — mislabelling today's shift as "Tomorrow".
 */
function toDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function labelForDay(dateKey: string, todayKey: string, tomorrowKey: string): string {
  if (dateKey === todayKey) return 'Today';
  if (dateKey === tomorrowKey) return 'Tomorrow';
  // dateKey is a calendar day; render it in UTC so it doesn't drift a day.
  const d = new Date(`${dateKey}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

interface UseShifts {
  loading: boolean;
  error: string | null;
  groups: ShiftDayGroup[];
  refresh: () => Promise<void>;
}

/** The signed-in worker's upcoming shifts (today + 4 weeks), grouped by day. */
export function useShifts(): UseShifts {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<ShiftDayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profile) return;
    setError(null);
    try {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + DAYS_AHEAD);

      const res = await api.get<ShiftListResponse>(
        `/shifts?from=${toDateParam(from)}&to=${toDateParam(to)}&limit=200`,
      );

      // GET /shifts returns the whole tenant roster — keep only shifts this
      // worker is assigned to.
      const mine = res.data.filter((s) => s.assignments.some((a) => a.user.id === profile.id));

      const todayKey = toDateParam(from);
      const tomorrow = new Date(from);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowKey = toDateParam(tomorrow);

      const byDay = new Map<string, RosterShift[]>();
      for (const shift of mine) {
        const key = shift.date.slice(0, 10);
        const list = byDay.get(key) ?? [];
        list.push(shift);
        byDay.set(key, list);
      }

      const sorted: ShiftDayGroup[] = [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, shifts]) => ({
          date,
          label: labelForDay(date, todayKey, tomorrowKey),
          shifts: shifts.sort((a, b) =>
            a.shiftPattern.startTime.localeCompare(b.shiftPattern.startTime),
          ),
        }));

      setGroups(sorted);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, error, groups, refresh };
}
