import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

// ── FHIR types ───────────────────────────────────────

interface FhirReference {
  reference?: string;
  display?: string;
}

interface FhirCarePlanGoal {
  id?: string;
  description: string;
  status: string;
  target?: { measure?: { text?: string }; dueDate?: string };
  note?: string;
}

interface FhirCarePlanActivity {
  id?: string;
  detail: {
    kind: string;
    status: string;
    description: string;
    scheduledString?: string;
    performer?: FhirReference[];
  };
}

interface FhirAnnotation {
  authorReference?: FhirReference;
  time?: string;
  text: string;
}

export interface FhirCarePlan {
  resourceType: string;
  id: string;
  meta?: { lastUpdated?: string };
  status: string;
  intent: string;
  category?: { text?: string }[];
  title: string;
  description?: string;
  subject: FhirReference;
  period?: { start?: string; end?: string };
  created?: string;
  author?: FhirReference;
  goal?: FhirCarePlanGoal[];
  activity?: FhirCarePlanActivity[];
  note?: FhirAnnotation[];
}

interface FhirBundle {
  total?: number;
  entry?: { resource?: FhirCarePlan }[];
}

interface CarePlanGoal {
  id: string;
  description: string;
  status: string;
  targetDate?: string;
  measure?: string;
  notes?: string;
}

interface CarePlanActivity {
  id: string;
  type: string;
  status: string;
  description: string;
  scheduledAt?: string;
  notes?: string;
  assigneeId?: string;
  assignee?: { id: string; givenName: string; familyName: string } | null;
}

interface CarePlanNote {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
}

interface PaginatedNotes {
  data: CarePlanNote[];
  total: number;
  page: number;
  limit: number;
}

interface SearchParams {
  patientId?: string;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export function useCarePlans() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCarePlans = useCallback(async (params: SearchParams): Promise<FhirBundle> => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (params.patientId) query.set('patientId', params.patientId);
      if (params.status) query.set('status', params.status);
      if (params.category) query.set('category', params.category);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      return await api.get<FhirBundle>(`/care-plans?${query.toString()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCarePlan = useCallback(async (id: string): Promise<FhirCarePlan> => {
    return api.get<FhirCarePlan>(`/care-plans/${id}`);
  }, []);

  const createCarePlan = useCallback(
    async (data: Record<string, unknown>): Promise<FhirCarePlan> => {
      return api.post<FhirCarePlan>('/care-plans', data);
    },
    [],
  );

  const updateCarePlan = useCallback(
    async (id: string, data: Record<string, unknown>): Promise<FhirCarePlan> => {
      return api.patch<FhirCarePlan>(`/care-plans/${id}`, data);
    },
    [],
  );

  // Goals
  const addGoal = useCallback(
    async (carePlanId: string, data: Record<string, unknown>): Promise<CarePlanGoal> => {
      return api.post<CarePlanGoal>(`/care-plans/${carePlanId}/goals`, data);
    },
    [],
  );

  const updateGoal = useCallback(
    async (
      carePlanId: string,
      goalId: string,
      data: Record<string, unknown>,
    ): Promise<CarePlanGoal> => {
      return api.patch<CarePlanGoal>(`/care-plans/${carePlanId}/goals/${goalId}`, data);
    },
    [],
  );

  const removeGoal = useCallback(async (carePlanId: string, goalId: string): Promise<void> => {
    await api.delete(`/care-plans/${carePlanId}/goals/${goalId}`);
  }, []);

  // Activities
  const addActivity = useCallback(
    async (carePlanId: string, data: Record<string, unknown>): Promise<CarePlanActivity> => {
      return api.post<CarePlanActivity>(`/care-plans/${carePlanId}/activities`, data);
    },
    [],
  );

  const updateActivity = useCallback(
    async (
      carePlanId: string,
      activityId: string,
      data: Record<string, unknown>,
    ): Promise<CarePlanActivity> => {
      return api.patch<CarePlanActivity>(
        `/care-plans/${carePlanId}/activities/${activityId}`,
        data,
      );
    },
    [],
  );

  const removeActivity = useCallback(
    async (carePlanId: string, activityId: string): Promise<void> => {
      await api.delete(`/care-plans/${carePlanId}/activities/${activityId}`);
    },
    [],
  );

  // Notes
  const addNote = useCallback(
    async (carePlanId: string, content: string): Promise<CarePlanNote> => {
      return api.post<CarePlanNote>(`/care-plans/${carePlanId}/notes`, { content });
    },
    [],
  );

  const getNotes = useCallback(
    async (carePlanId: string, page?: number, limit?: number): Promise<PaginatedNotes> => {
      const query = new URLSearchParams();
      if (page) query.set('page', String(page));
      if (limit) query.set('limit', String(limit));
      return api.get<PaginatedNotes>(`/care-plans/${carePlanId}/notes?${query.toString()}`);
    },
    [],
  );

  return {
    searchCarePlans,
    getCarePlan,
    createCarePlan,
    updateCarePlan,
    addGoal,
    updateGoal,
    removeGoal,
    addActivity,
    updateActivity,
    removeActivity,
    addNote,
    getNotes,
    loading,
    error,
  };
}

export type {
  FhirBundle as CarePlanBundle,
  CarePlanGoal,
  CarePlanActivity,
  CarePlanNote,
  PaginatedNotes,
  SearchParams as CarePlanSearchParams,
  FhirCarePlanGoal,
  FhirCarePlanActivity,
  FhirAnnotation,
};
