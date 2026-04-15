import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

export interface ShiftPatternInfo {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  shiftType: string;
  breakMinutes: number;
}

export interface LocationInfo {
  id: string;
  name: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  geofenceRadius: number | null;
}

export interface ClockRecordInfo {
  id: string;
  status: 'CLOCKED_IN' | 'CLOCKED_OUT' | 'MISSED' | 'AUTO_CLOCKED_OUT';
  clockInAt: string;
  clockInDistance: number | null;
  clockOutAt: string | null;
  autoClockOut: boolean;
  notes: string | null;
}

export interface MyShiftToday {
  id: string;
  role: string | null;
  confirmedAt: string | null;
  shift: {
    id: string;
    date: string;
    status: string;
    notes: string | null;
    shiftPattern: ShiftPatternInfo;
    location: LocationInfo | null;
  };
  clockRecord: ClockRecordInfo | null;
}

export function useClock(): {
  shifts: MyShiftToday[];
  loading: boolean;
  error: string | null;
  fetchMyShiftsToday: () => Promise<void>;
  clockIn: (shiftAssignmentId: string, latitude: number, longitude: number) => Promise<void>;
  clockOut: (
    shiftAssignmentId: string,
    latitude?: number,
    longitude?: number,
    notes?: string,
  ) => Promise<void>;
} {
  const [shifts, setShifts] = useState<MyShiftToday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyShiftsToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<MyShiftToday[]>('/shifts/my-today');
      setShifts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }, []);

  const clockIn = useCallback(
    async (shiftAssignmentId: string, latitude: number, longitude: number) => {
      setError(null);
      try {
        await api.post('/clock-in', { shiftAssignmentId, latitude, longitude });
        await fetchMyShiftsToday();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to clock in';
        setError(msg);
        throw err;
      }
    },
    [fetchMyShiftsToday],
  );

  const clockOut = useCallback(
    async (shiftAssignmentId: string, latitude?: number, longitude?: number, notes?: string) => {
      setError(null);
      try {
        await api.post('/clock-out', { shiftAssignmentId, latitude, longitude, notes });
        await fetchMyShiftsToday();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to clock out';
        setError(msg);
        throw err;
      }
    },
    [fetchMyShiftsToday],
  );

  return { shifts, loading, error, fetchMyShiftsToday, clockIn, clockOut };
}
