import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

// ── Types ───────────────────────────────────────

interface FhirReference {
  reference?: string;
  display?: string;
}

export interface FhirAssessment {
  resourceType: string;
  id: string;
  meta?: { lastUpdated?: string };
  status: string;
  code: { coding?: { code?: string; display?: string }[]; text?: string };
  subject: FhirReference;
  effectiveDateTime?: string;
  performer?: FhirReference[];
  valueQuantity?: { value?: number; unit?: string };
  interpretation?: { coding?: { code?: string; display?: string }[]; text?: string }[];
  note?: { text: string }[];
  title?: string;
  description?: string;
  toolName?: string;
  maxScore?: number;
  scoreInterpretation?: string;
  recommendedActions?: string[];
  responses?: unknown;
  reviewedBy?: FhirReference;
  reviewedAt?: string;
}

interface FhirBundle {
  total?: number;
  entry?: { resource?: FhirAssessment }[];
}

interface SearchParams {
  patientId?: string;
  assessmentType?: string;
  status?: string;
  riskLevel?: string;
  page?: number;
  limit?: number;
}

export function useAssessments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchAssessments = useCallback(async (params: SearchParams): Promise<FhirBundle> => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (params.patientId) query.set('patientId', params.patientId);
      if (params.assessmentType) query.set('assessmentType', params.assessmentType);
      if (params.status) query.set('status', params.status);
      if (params.riskLevel) query.set('riskLevel', params.riskLevel);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      return await api.get<FhirBundle>(`/assessments?${query.toString()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAssessment = useCallback(async (id: string): Promise<FhirAssessment> => {
    return api.get<FhirAssessment>(`/assessments/${id}`);
  }, []);

  const createAssessment = useCallback(
    async (data: Record<string, unknown>): Promise<FhirAssessment> => {
      return api.post<FhirAssessment>('/assessments', data);
    },
    [],
  );

  const updateAssessment = useCallback(
    async (id: string, data: Record<string, unknown>): Promise<FhirAssessment> => {
      return api.patch<FhirAssessment>(`/assessments/${id}`, data);
    },
    [],
  );

  const reviewAssessment = useCallback(async (id: string): Promise<FhirAssessment> => {
    return api.patch<FhirAssessment>(`/assessments/${id}/review`, {});
  }, []);

  return {
    searchAssessments,
    getAssessment,
    createAssessment,
    updateAssessment,
    reviewAssessment,
    loading,
    error,
  };
}

export type { FhirBundle as AssessmentBundle, SearchParams as AssessmentSearchParams };
