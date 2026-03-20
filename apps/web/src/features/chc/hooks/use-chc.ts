import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

// ── Types ────────────────────────────────────────────────

export interface ChcPatient {
  givenName: string;
  familyName: string;
  birthDate?: string;
}

export interface ChcReferrer {
  firstName: string;
  lastName: string;
}

export interface ChcDomainScore {
  id: string;
  domain: string;
  level: string;
  evidence?: string;
  notes?: string;
  assessor: { firstName: string; lastName: string };
  createdAt: string;
}

export interface ChcPanelMember {
  id: string;
  role: string;
  user: { firstName: string; lastName: string; email: string };
  createdAt: string;
}

export interface ChcNote {
  id: string;
  content: string;
  phase: string;
  author: { firstName: string; lastName: string };
  createdAt: string;
}

export interface ChcCase {
  id: string;
  status: string;
  referralDate: string;
  referralReason: string;
  isFastTrack: boolean;
  fastTrackReason?: string;
  screeningDate?: string;
  screeningOutcome?: string;
  screeningNotes?: string;
  decisionDate?: string;
  decision?: string;
  decisionNotes?: string;
  fundingBand?: string;
  carePackageStartDate?: string;
  annualReviewDate?: string;
  patient: ChcPatient & { id?: string };
  referrer: ChcReferrer;
  screener?: ChcReferrer;
  encounter?: { id: string; status: string; class: string };
  carePlan?: { id: string; title: string; status: string };
  domainScores?: ChcDomainScore[];
  panelMembers?: ChcPanelMember[];
  notes?: ChcNote[];
  createdAt: string;
}

export interface ChcSearchResult {
  data: ChcCase[];
  total: number;
  page: number;
  limit: number;
}

// ── Hook ─────────────────────────────────────────────────

export function useChc() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCases = useCallback(
    async (params: {
      status?: string;
      patientId?: string;
      page?: number;
      limit?: number;
    }): Promise<ChcSearchResult> => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (params.status) qs.set('status', params.status);
        if (params.patientId) qs.set('patientId', params.patientId);
        if (params.page) qs.set('page', String(params.page));
        if (params.limit) qs.set('limit', String(params.limit));
        return await api.get<ChcSearchResult>(`/chc/cases?${qs.toString()}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load CHC cases';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getCase = useCallback(async (id: string): Promise<ChcCase> => {
    setLoading(true);
    setError(null);
    try {
      return await api.get<ChcCase>(`/chc/cases/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load CHC case';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDueForReview = useCallback(async (): Promise<ChcCase[]> => {
    return api.get<ChcCase[]>('/chc/cases/due-for-review');
  }, []);

  const createCase = useCallback(
    async (data: {
      patientId: string;
      encounterId?: string;
      referralReason: string;
      isFastTrack: boolean;
      fastTrackReason?: string;
    }): Promise<ChcCase> => {
      return api.post<ChcCase>('/chc/cases', data);
    },
    [],
  );

  const updateScreening = useCallback(
    async (
      id: string,
      data: { screeningOutcome: string; screeningNotes?: string },
    ): Promise<ChcCase> => {
      return api.patch<ChcCase>(`/chc/cases/${id}/screening`, data);
    },
    [],
  );

  const upsertDomainScore = useCallback(
    async (
      id: string,
      data: { domain: string; level: string; evidence?: string; notes?: string },
    ): Promise<ChcDomainScore> => {
      return api.post<ChcDomainScore>(`/chc/cases/${id}/domain-scores`, data);
    },
    [],
  );

  const getDomainScores = useCallback(async (id: string): Promise<ChcDomainScore[]> => {
    return api.get<ChcDomainScore[]>(`/chc/cases/${id}/domain-scores`);
  }, []);

  const addPanelMember = useCallback(
    async (id: string, data: { userId: string; role: string }): Promise<ChcPanelMember> => {
      return api.post<ChcPanelMember>(`/chc/cases/${id}/panel-members`, data);
    },
    [],
  );

  const removePanelMember = useCallback(async (caseId: string, memberId: string): Promise<void> => {
    await api.delete(`/chc/cases/${caseId}/panel-members/${memberId}`);
  }, []);

  const recordDecision = useCallback(
    async (
      id: string,
      data: { decision: string; fundingBand?: string; decisionNotes?: string },
    ): Promise<ChcCase> => {
      return api.post<ChcCase>(`/chc/cases/${id}/decision`, data);
    },
    [],
  );

  const setupCarePackage = useCallback(
    async (
      id: string,
      data: { carePlanId?: string; carePackageStartDate: string; annualReviewDate?: string },
    ): Promise<ChcCase> => {
      return api.post<ChcCase>(`/chc/cases/${id}/care-package`, data);
    },
    [],
  );

  const triggerAnnualReview = useCallback(async (id: string): Promise<ChcCase> => {
    return api.post<ChcCase>(`/chc/cases/${id}/annual-review`, {});
  }, []);

  const closeCase = useCallback(async (id: string): Promise<ChcCase> => {
    return api.post<ChcCase>(`/chc/cases/${id}/close`, {});
  }, []);

  const addNote = useCallback(async (id: string, content: string): Promise<ChcNote> => {
    return api.post<ChcNote>(`/chc/cases/${id}/notes`, { content });
  }, []);

  return {
    searchCases,
    getCase,
    getDueForReview,
    createCase,
    updateScreening,
    upsertDomainScore,
    getDomainScores,
    addPanelMember,
    removePanelMember,
    recordDecision,
    setupCarePackage,
    triggerAnnualReview,
    closeCase,
    addNote,
    loading,
    error,
  };
}
