import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

// ── Types ────────────────────────────────────────────────

export interface VwPatient {
  id?: string;
  givenName: string;
  familyName: string;
  birthDate?: string;
}

export interface VwThreshold {
  id: string;
  minValue?: number;
  maxValue?: number;
  severity: string;
}

export interface VwProtocol {
  id: string;
  vitalType: string;
  frequencyHours: number;
  isActive: boolean;
  thresholds: VwThreshold[];
}

export interface VwObservation {
  id: string;
  vitalType: string;
  value: number;
  unit: string;
  notes?: string;
  recordedAt: string;
  recorder: { firstName: string; lastName: string } | null;
}

export interface VwAlert {
  id: string;
  severity: string;
  status: string;
  message: string;
  vitalType?: string;
  triggerValue?: number;
  thresholdBreached?: string;
  acknowledger?: { firstName: string; lastName: string };
  escalatedTo?: { firstName: string; lastName: string };
  resolver?: { firstName: string; lastName: string };
  resolveNotes?: string;
  createdAt: string;
  acknowledgedAt?: string;
  escalatedAt?: string;
  resolvedAt?: string;
}

export interface VwEnrolment {
  id: string;
  status: string;
  enrolmentDate: string;
  dischargeDate?: string;
  dischargeReason?: string;
  clinicalSummary?: string;
  patient: VwPatient;
  encounter?: { id: string; status: string; class: string };
  enroller: { firstName: string; lastName: string };
  discharger?: { firstName: string; lastName: string };
  protocols?: VwProtocol[];
  observations?: VwObservation[];
  alerts?: VwAlert[];
  _count?: { alerts: number };
  createdAt: string;
}

export interface VwSearchResult {
  data: VwEnrolment[];
  total: number;
  page: number;
  limit: number;
}

export interface VwDashboard {
  enrolledCount: number;
  openAlertCount: number;
  alertsBySeverity: { severity: string; count: number }[];
}

// ── Hook ─────────────────────────────────────────────────

export function useVirtualWards() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchEnrolments = useCallback(
    async (params: {
      status?: string;
      patientId?: string;
      page?: number;
      limit?: number;
    }): Promise<VwSearchResult> => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (params.status) qs.set('status', params.status);
        if (params.patientId) qs.set('patientId', params.patientId);
        if (params.page) qs.set('page', String(params.page));
        if (params.limit) qs.set('limit', String(params.limit));
        return await api.get<VwSearchResult>(`/virtual-wards/enrolments?${qs.toString()}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load enrolments';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getDashboard = useCallback(async (): Promise<VwDashboard> => {
    return api.get<VwDashboard>('/virtual-wards/dashboard');
  }, []);

  const getEnrolment = useCallback(async (id: string): Promise<VwEnrolment> => {
    setLoading(true);
    setError(null);
    try {
      return await api.get<VwEnrolment>(`/virtual-wards/enrolments/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load enrolment';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const enrolPatient = useCallback(
    async (data: {
      patientId: string;
      encounterId: string;
      clinicalSummary?: string;
    }): Promise<VwEnrolment> => {
      return api.post<VwEnrolment>('/virtual-wards/enrolments', data);
    },
    [],
  );

  const createProtocol = useCallback(
    async (
      enrolmentId: string,
      data: {
        vitalType: string;
        frequencyHours: number;
        thresholds: { minValue?: number; maxValue?: number; severity: string }[];
      },
    ): Promise<VwProtocol> => {
      return api.post<VwProtocol>(`/virtual-wards/enrolments/${enrolmentId}/protocols`, data);
    },
    [],
  );

  const updateProtocol = useCallback(
    async (
      enrolmentId: string,
      protocolId: string,
      data: {
        frequencyHours?: number;
        isActive?: boolean;
        thresholds?: { minValue?: number; maxValue?: number; severity: string }[];
      },
    ): Promise<VwProtocol> => {
      return api.patch<VwProtocol>(
        `/virtual-wards/enrolments/${enrolmentId}/protocols/${protocolId}`,
        data,
      );
    },
    [],
  );

  const deleteProtocol = useCallback(
    async (enrolmentId: string, protocolId: string): Promise<void> => {
      await api.delete(`/virtual-wards/enrolments/${enrolmentId}/protocols/${protocolId}`);
    },
    [],
  );

  const recordObservation = useCallback(
    async (
      enrolmentId: string,
      data: { vitalType: string; value: number; unit: string; notes?: string },
    ): Promise<VwObservation> => {
      return api.post<VwObservation>(`/virtual-wards/enrolments/${enrolmentId}/observations`, data);
    },
    [],
  );

  const getObservations = useCallback(async (enrolmentId: string): Promise<VwObservation[]> => {
    return api.get<VwObservation[]>(`/virtual-wards/enrolments/${enrolmentId}/observations`);
  }, []);

  const getAlerts = useCallback(async (enrolmentId: string): Promise<VwAlert[]> => {
    return api.get<VwAlert[]>(`/virtual-wards/enrolments/${enrolmentId}/alerts`);
  }, []);

  const acknowledgeAlert = useCallback(
    async (enrolmentId: string, alertId: string): Promise<VwAlert> => {
      return api.post<VwAlert>(
        `/virtual-wards/enrolments/${enrolmentId}/alerts/${alertId}/acknowledge`,
        {},
      );
    },
    [],
  );

  const escalateAlert = useCallback(
    async (enrolmentId: string, alertId: string, escalatedToId: string): Promise<VwAlert> => {
      return api.post<VwAlert>(
        `/virtual-wards/enrolments/${enrolmentId}/alerts/${alertId}/escalate`,
        { escalatedToId },
      );
    },
    [],
  );

  const resolveAlert = useCallback(
    async (enrolmentId: string, alertId: string, resolveNotes?: string): Promise<VwAlert> => {
      return api.post<VwAlert>(
        `/virtual-wards/enrolments/${enrolmentId}/alerts/${alertId}/resolve`,
        { resolveNotes },
      );
    },
    [],
  );

  const discharge = useCallback(
    async (
      enrolmentId: string,
      data: { dischargeReason: string; clinicalSummary?: string },
    ): Promise<VwEnrolment> => {
      return api.post<VwEnrolment>(`/virtual-wards/enrolments/${enrolmentId}/discharge`, data);
    },
    [],
  );

  return {
    searchEnrolments,
    getDashboard,
    getEnrolment,
    enrolPatient,
    createProtocol,
    updateProtocol,
    deleteProtocol,
    recordObservation,
    getObservations,
    getAlerts,
    acknowledgeAlert,
    escalateAlert,
    resolveAlert,
    discharge,
    loading,
    error,
  };
}
