import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

interface FhirPatient {
  id: string;
  resourceType: string;
  active?: boolean;
  identifier?: { system?: string; value: string; use?: string }[];
  name?: { family?: string; given?: string[]; prefix?: string[] }[];
  gender?: string;
  birthDate?: string;
  telecom?: { system?: string; value?: string }[];
  address?: { line?: string[]; city?: string; postalCode?: string }[];
  managingOrganization?: { reference?: string; display?: string };
  generalPractitioner?: { reference?: string; display?: string }[];
}

interface FhirBundle {
  total?: number;
  entry?: { resource?: FhirPatient }[];
}

interface TimelineEntry {
  id: string;
  eventType: string;
  summary: string;
  detail?: Record<string, unknown>;
  careSetting?: string;
  occurredAt: string;
  recordedBy: { id: string; firstName: string; lastName: string };
}

interface PaginatedTimeline {
  data: TimelineEntry[];
  total: number;
  page: number;
  limit: number;
}

interface SearchParams {
  name?: string;
  nhsNumber?: string;
  birthDate?: string;
  postalCode?: string;
  page?: number;
  limit?: number;
}

interface FhirPractitioner {
  id: string;
  name?: { family?: string; given?: string[] }[];
  active?: boolean;
}

interface PractitionerList {
  data: FhirPractitioner[];
  total: number;
}

interface FhirOrganization {
  id: string;
  name?: string;
  active?: boolean;
}

interface OrgBundle {
  total?: number;
  entry?: { resource?: FhirOrganization }[];
}

export function usePatients() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPatients = useCallback(async (params: SearchParams): Promise<FhirBundle> => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (params.name) query.set('name', params.name);
      if (params.nhsNumber) query.set('nhsNumber', params.nhsNumber);
      if (params.birthDate) query.set('birthDate', params.birthDate);
      if (params.postalCode) query.set('postalCode', params.postalCode);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      return await api.get<FhirBundle>(`/patients?${query.toString()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPatient = useCallback(async (id: string): Promise<FhirPatient> => {
    return api.get<FhirPatient>(`/patients/${id}`);
  }, []);

  const createPatient = useCallback(async (data: Record<string, unknown>): Promise<FhirPatient> => {
    return api.post<FhirPatient>('/patients', data);
  }, []);

  const updatePatient = useCallback(
    async (id: string, data: Record<string, unknown>): Promise<FhirPatient> => {
      return api.patch<FhirPatient>(`/patients/${id}`, data);
    },
    [],
  );

  const getTimeline = useCallback(
    async (
      id: string,
      filters?: { eventType?: string; careSetting?: string; page?: number; limit?: number },
    ): Promise<PaginatedTimeline> => {
      const query = new URLSearchParams();
      if (filters?.eventType) query.set('eventType', filters.eventType);
      if (filters?.careSetting) query.set('careSetting', filters.careSetting);
      if (filters?.page) query.set('page', String(filters.page));
      if (filters?.limit) query.set('limit', String(filters.limit));
      return api.get<PaginatedTimeline>(`/patients/${id}/timeline?${query.toString()}`);
    },
    [],
  );

  const addEvent = useCallback(
    async (
      patientId: string,
      data: {
        eventType: string;
        summary: string;
        detail?: Record<string, unknown>;
        careSetting?: string;
      },
    ): Promise<TimelineEntry> => {
      return api.post<TimelineEntry>(`/patients/${patientId}/events`, data);
    },
    [],
  );

  const getPractitioners = useCallback(async (): Promise<FhirPractitioner[]> => {
    const result = await api.get<PractitionerList>('/practitioners?limit=100');
    return result.data;
  }, []);

  const getOrganizations = useCallback(async (): Promise<FhirOrganization[]> => {
    const result = await api.get<OrgBundle>('/organizations?limit=100');
    return (result.entry ?? []).map((e) => e.resource).filter((r): r is FhirOrganization => !!r);
  }, []);

  return {
    searchPatients,
    getPatient,
    createPatient,
    updatePatient,
    getTimeline,
    addEvent,
    getPractitioners,
    getOrganizations,
    loading,
    error,
  };
}

export type {
  FhirPatient,
  FhirBundle,
  FhirPractitioner,
  FhirOrganization,
  TimelineEntry,
  PaginatedTimeline,
  SearchParams,
};
