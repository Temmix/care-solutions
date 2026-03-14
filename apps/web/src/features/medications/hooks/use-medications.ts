import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

// ── Types ────────────────────────────────────────────

interface FhirReference {
  reference?: string;
  display?: string;
}

interface FhirDosage {
  text?: string;
  route?: { text?: string };
  timing?: { code?: { text?: string } };
  asNeededBoolean?: boolean;
  maxDosePerPeriod?: {
    numerator?: { unit?: string };
    denominator?: { value?: number; unit?: string };
  };
}

export interface FhirMedicationRequest {
  resourceType: string;
  id: string;
  meta?: { lastUpdated?: string };
  status: string;
  intent: string;
  priority?: string;
  medicationReference?: FhirReference;
  subject: FhirReference;
  requester?: FhirReference;
  reasonCode?: { text?: string }[];
  dosageInstruction?: FhirDosage[];
  dispenseRequest?: {
    validityPeriod?: { start?: string; end?: string };
  };
  note?: string;
  contained?: FhirMedicationAdministration[];
}

export interface FhirMedicationAdministration {
  resourceType: string;
  id: string;
  status: string;
  effectiveDateTime?: string;
  performer?: { actor: FhirReference }[];
  dosage?: {
    text?: string;
    route?: { text?: string };
    site?: { text?: string };
  };
  note?: string;
  statusReason?: { text?: string }[];
}

export interface MedicationCatalogueItem {
  id: string;
  name: string;
  genericName?: string;
  code?: string;
  form: string;
  strength?: string;
  manufacturer?: string;
  isActive: boolean;
}

interface FhirBundle {
  total?: number;
  entry?: { resource?: FhirMedicationRequest }[];
}

interface SearchParams {
  patientId?: string;
  medicationId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useMedications() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Catalogue ──────────────────────────────────────

  const getCatalogue = useCallback(async (): Promise<MedicationCatalogueItem[]> => {
    return api.get<MedicationCatalogueItem[]>('/medications/catalogue');
  }, []);

  const createMedication = useCallback(
    async (data: Record<string, unknown>): Promise<MedicationCatalogueItem> => {
      return api.post<MedicationCatalogueItem>('/medications/catalogue', data);
    },
    [],
  );

  const updateMedication = useCallback(
    async (id: string, data: Record<string, unknown>): Promise<MedicationCatalogueItem> => {
      return api.patch<MedicationCatalogueItem>(`/medications/catalogue/${id}`, data);
    },
    [],
  );

  // ── Prescriptions ──────────────────────────────────

  const searchPrescriptions = useCallback(async (params: SearchParams): Promise<FhirBundle> => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (params.patientId) query.set('patientId', params.patientId);
      if (params.medicationId) query.set('medicationId', params.medicationId);
      if (params.status) query.set('status', params.status);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      return await api.get<FhirBundle>(`/medications/prescriptions?${query.toString()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPrescription = useCallback(async (id: string): Promise<FhirMedicationRequest> => {
    return api.get<FhirMedicationRequest>(`/medications/prescriptions/${id}`);
  }, []);

  const createPrescription = useCallback(
    async (data: Record<string, unknown>): Promise<FhirMedicationRequest> => {
      return api.post<FhirMedicationRequest>('/medications/prescriptions', data);
    },
    [],
  );

  const updatePrescription = useCallback(
    async (id: string, data: Record<string, unknown>): Promise<FhirMedicationRequest> => {
      return api.patch<FhirMedicationRequest>(`/medications/prescriptions/${id}`, data);
    },
    [],
  );

  // ── Administrations ────────────────────────────────

  const recordAdministration = useCallback(
    async (data: Record<string, unknown>): Promise<unknown> => {
      return api.post('/medications/administrations', data);
    },
    [],
  );

  return {
    getCatalogue,
    createMedication,
    updateMedication,
    searchPrescriptions,
    getPrescription,
    createPrescription,
    updatePrescription,
    recordAdministration,
    loading,
    error,
  };
}
