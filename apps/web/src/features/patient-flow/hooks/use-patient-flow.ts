import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

export interface Location {
  id: string;
  name: string;
  type: string;
  ward: string | null;
  floor: string | null;
  status: string;
  capacity: number;
  parentId: string | null;
  children: Location[];
  beds: Bed[];
  _count?: { beds: number; encounters: number };
}

export interface Bed {
  id: string;
  identifier: string;
  status: string;
  notes: string | null;
  location?: Location;
}

export interface Encounter {
  id: string;
  status: string;
  class: string;
  admissionSource: string | null;
  admissionDate: string;
  dischargeDate: string | null;
  dischargeDestination: string | null;
  notes: string | null;
  patient: { id: string; givenName: string; familyName: string };
  location: Location | null;
  bed: Bed | null;
  primaryPractitioner: { id: string; firstName: string; lastName: string } | null;
  transfers?: Transfer[];
}

export interface Transfer {
  id: string;
  transferredAt: string;
  reason: string | null;
  fromLocation: Location | null;
  toLocation: Location;
  fromBed: Bed | null;
  toBed: Bed | null;
  transferredBy: { id: string; firstName: string; lastName: string };
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export function usePatientFlow() {
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

  // Locations
  const listLocations = useCallback(() => wrap(() => api.get<Location[]>('/locations')), [wrap]);

  const createLocation = useCallback(
    (data: Record<string, unknown>) => wrap(() => api.post<Location>('/locations', data)),
    [wrap],
  );

  const updateLocation = useCallback(
    (id: string, data: Record<string, unknown>) =>
      wrap(() => api.patch<Location>(`/locations/${id}`, data)),
    [wrap],
  );

  // Beds
  const listBeds = useCallback(
    (params?: { locationId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.locationId) q.set('locationId', params.locationId);
      if (params?.status) q.set('status', params.status);
      return wrap(() => api.get<Bed[]>(`/beds?${q.toString()}`));
    },
    [wrap],
  );

  const createBed = useCallback(
    (data: { identifier: string; locationId: string; notes?: string }) =>
      wrap(() => api.post<Bed>('/beds', data)),
    [wrap],
  );

  const updateBed = useCallback(
    (id: string, data: { status?: string; notes?: string }) =>
      wrap(() => api.patch<Bed>(`/beds/${id}`, data)),
    [wrap],
  );

  // Encounters
  const admitPatient = useCallback(
    (data: Record<string, unknown>) => wrap(() => api.post<Encounter>('/encounters/admit', data)),
    [wrap],
  );

  const listEncounters = useCallback(
    (params?: { status?: string; patientId?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.patientId) q.set('patientId', params.patientId);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      return wrap(() => api.get<Paginated<Encounter>>(`/encounters?${q.toString()}`));
    },
    [wrap],
  );

  const getEncounter = useCallback(
    (id: string) => wrap(() => api.get<Encounter>(`/encounters/${id}`)),
    [wrap],
  );

  const transferPatient = useCallback(
    (encounterId: string, data: { toLocationId: string; toBedId?: string; reason?: string }) =>
      wrap(() => api.post<Transfer>(`/encounters/${encounterId}/transfer`, data)),
    [wrap],
  );

  const dischargePatient = useCallback(
    (encounterId: string, data: { destination: string; notes?: string }) =>
      wrap(() => api.post<Encounter>(`/encounters/${encounterId}/discharge`, data)),
    [wrap],
  );

  return {
    loading,
    error,
    listLocations,
    createLocation,
    updateLocation,
    listBeds,
    createBed,
    updateBed,
    admitPatient,
    listEncounters,
    getEncounter,
    transferPatient,
    dischargePatient,
  };
}
