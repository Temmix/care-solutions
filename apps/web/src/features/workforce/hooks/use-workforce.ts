import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

export interface ShiftPattern {
  id: string;
  name: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  color: string | null;
  isActive: boolean;
}

export interface ShiftAssignment {
  id: string;
  role: string | null;
  confirmedAt: string | null;
  user: { id: string; firstName: string; lastName: string; role: string };
}

export interface ShiftLocation {
  id: string;
  name: string;
  type: string;
}

export interface Shift {
  id: string;
  date: string;
  status: string;
  notes: string | null;
  shiftPattern: ShiftPattern;
  location: ShiftLocation | null;
  assignments: ShiftAssignment[];
}

export interface AssignableStaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  membershipRole: string;
  status: 'available' | 'warning' | 'blocked';
  reasons: string[];
  alreadyAssigned: boolean;
}

export interface StaffAvailability {
  id: string;
  date: string;
  endDate: string | null;
  type: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  user?: { id: string; firstName: string; lastName: string; role: string };
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export function useWorkforce() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrap = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Shift Patterns
  const listShiftPatterns = useCallback(
    () => wrap(() => api.get<ShiftPattern[]>('/shift-patterns')),
    [wrap],
  );

  const createShiftPattern = useCallback(
    (data: Record<string, unknown>) => wrap(() => api.post<ShiftPattern>('/shift-patterns', data)),
    [wrap],
  );

  const updateShiftPattern = useCallback(
    (id: string, data: Record<string, unknown>) =>
      wrap(() => api.patch<ShiftPattern>(`/shift-patterns/${id}`, data)),
    [wrap],
  );

  const deleteShiftPattern = useCallback(
    (id: string) => wrap(() => api.delete(`/shift-patterns/${id}`)),
    [wrap],
  );

  // Shifts
  const listShifts = useCallback(
    (params?: { from?: string; to?: string; status?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      if (params?.status) q.set('status', params.status);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return wrap(() => api.get<Paginated<Shift>>(`/shifts?${q.toString()}`));
    },
    [wrap],
  );

  const getShift = useCallback((id: string) => wrap(() => api.get<Shift>(`/shifts/${id}`)), [wrap]);

  const createShift = useCallback(
    (data: { date: string; shiftPatternId: string; locationId?: string; notes?: string }) =>
      wrap(() => api.post<Shift>('/shifts', data)),
    [wrap],
  );

  const updateShift = useCallback(
    (id: string, data: { status?: string; notes?: string }) =>
      wrap(() => api.patch<Shift>(`/shifts/${id}`, data)),
    [wrap],
  );

  const assignShift = useCallback(
    (shiftId: string, data: { userId: string; role?: string }) =>
      wrap(() =>
        api.post<ShiftAssignment & { warnings?: string[] }>(`/shifts/${shiftId}/assign`, data),
      ),
    [wrap],
  );

  const deleteShift = useCallback((id: string) => wrap(() => api.delete(`/shifts/${id}`)), [wrap]);

  const removeAssignment = useCallback(
    (shiftId: string, userId: string) =>
      wrap(() => api.delete(`/shifts/${shiftId}/assign/${userId}`)),
    [wrap],
  );

  const getAssignableStaff = useCallback(
    (shiftId: string) =>
      wrap(() => api.get<AssignableStaffMember[]>(`/shifts/${shiftId}/assignable-staff`)),
    [wrap],
  );

  // Availability
  const createAvailability = useCallback(
    (data: Record<string, unknown>) =>
      wrap(() => api.post<StaffAvailability>('/availability', data)),
    [wrap],
  );

  const listAvailability = useCallback(
    (params?: { from?: string; to?: string; userId?: string }) => {
      const q = new URLSearchParams();
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      if (params?.userId) q.set('userId', params.userId);
      return wrap(() => api.get<Paginated<StaffAvailability>>(`/availability?${q.toString()}`));
    },
    [wrap],
  );

  const getMyAvailability = useCallback(
    (params?: { from?: string; to?: string }) => {
      const q = new URLSearchParams();
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      return wrap(() => api.get<StaffAvailability[]>(`/availability/me?${q.toString()}`));
    },
    [wrap],
  );

  const deleteAvailability = useCallback(
    (id: string) => wrap(() => api.delete(`/availability/${id}`)),
    [wrap],
  );

  // Shift Swaps
  const createSwapRequest = useCallback(
    (data: {
      originalShiftAssignmentId: string;
      targetShiftAssignmentId?: string;
      reason?: string;
    }) => wrap(() => api.post<SwapRequest>('/swaps', data)),
    [wrap],
  );

  const getOpenSwaps = useCallback(() => wrap(() => api.get<SwapRequest[]>('/swaps')), [wrap]);

  const getMySwapRequests = useCallback(
    () => wrap(() => api.get<SwapRequest[]>('/swaps/mine')),
    [wrap],
  );

  const getPendingApprovals = useCallback(
    () => wrap(() => api.get<SwapRequest[]>('/swaps/pending-approval')),
    [wrap],
  );

  const respondToSwap = useCallback(
    (swapId: string, data: { targetShiftAssignmentId: string }) =>
      wrap(() => api.post<SwapRequest>(`/swaps/${swapId}/respond`, data)),
    [wrap],
  );

  const approveSwap = useCallback(
    (swapId: string) => wrap(() => api.post<SwapRequest>(`/swaps/${swapId}/approve`, {})),
    [wrap],
  );

  const rejectSwap = useCallback(
    (swapId: string, managerNote?: string) =>
      wrap(() => api.post<SwapRequest>(`/swaps/${swapId}/reject`, { managerNote })),
    [wrap],
  );

  const cancelSwapRequest = useCallback(
    (swapId: string) => wrap(() => api.post(`/swaps/${swapId}/cancel`, {})),
    [wrap],
  );

  // Compliance
  const getComplianceReport = useCallback(
    (from: string, to: string) =>
      wrap(() => api.get<ComplianceReport>(`/compliance/report?from=${from}&to=${to}`)),
    [wrap],
  );

  return {
    loading,
    error,
    listShiftPatterns,
    createShiftPattern,
    updateShiftPattern,
    deleteShiftPattern,
    listShifts,
    getShift,
    createShift,
    updateShift,
    assignShift,
    deleteShift,
    removeAssignment,
    getAssignableStaff,
    createAvailability,
    listAvailability,
    getMyAvailability,
    deleteAvailability,
    createSwapRequest,
    getOpenSwaps,
    getMySwapRequests,
    getPendingApprovals,
    respondToSwap,
    approveSwap,
    rejectSwap,
    cancelSwapRequest,
    getComplianceReport,
  };
}

export interface SwapRequest {
  id: string;
  status: string;
  reason: string | null;
  managerNote: string | null;
  requester: { id: string; firstName: string; lastName: string; role?: string };
  responder: { id: string; firstName: string; lastName: string; role?: string } | null;
  approvedBy: { id: string; firstName: string; lastName: string } | null;
  originalShiftAssignment: {
    id: string;
    shift: {
      id: string;
      date: string;
      shiftPattern: ShiftPattern;
      location?: ShiftLocation | null;
    };
  };
  targetShiftAssignment: {
    id: string;
    shift: {
      id: string;
      date: string;
      shiftPattern: ShiftPattern;
      location?: ShiftLocation | null;
    };
  } | null;
  createdAt: string;
}

export interface ComplianceReport {
  period: { from: string; to: string };
  summary: {
    totalStaff: number;
    totalShifts: number;
    totalHoursScheduled: number;
    violationCount: number;
    complianceScore: number;
  };
  workingTimeViolations: {
    weeklyHoursExceeded: Array<{ userId: string; name: string; weekStart: string; hours: number }>;
    insufficientRest: Array<{ userId: string; name: string; date: string; restHours: number }>;
    consecutiveDaysExceeded: Array<{
      userId: string;
      name: string;
      startDate: string;
      days: number;
    }>;
  };
  staffingByLocation: Array<{
    locationId: string;
    locationName: string;
    totalBeds: number;
    avgStaffPerShift: number;
    staffToPatientRatio: number;
  }>;
  overtimeHours: Array<{
    userId: string;
    name: string;
    scheduledHours: number;
    overtimeHours: number;
  }>;
}
