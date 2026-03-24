import { useCallback } from 'react';
import { api } from '../../../lib/api-client';

export interface PatientCensusData {
  activePatients: number;
  inactivePatients: number;
  deceasedPatients: number;
  admissionsOverTime: { date: string; admissions: number; discharges: number }[];
}

export interface BedOccupancyData {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  maintenanceBeds: number;
  occupancyRate: number;
  byLocation: { locationName: string; total: number; occupied: number; rate: number }[];
  averageLengthOfStay: number;
}

export interface WorkforceComplianceData {
  totalShifts: number;
  filledShifts: number;
  fillRate: number;
  averageAssignmentsPerShift: number;
  upcomingGaps: { date: string; shiftType: string }[];
}

export interface CarePlanReviewsData {
  totalActivePlans: number;
  overdueReviews: {
    id: string;
    title: string;
    patientName: string;
    nextReviewDate: string;
    daysOverdue: number;
  }[];
  upcomingReviews: {
    id: string;
    title: string;
    patientName: string;
    nextReviewDate: string;
    daysUntil: number;
  }[];
  byCategory: { category: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

export interface ChcPipelineData {
  totalCases: number;
  byStatus: { status: string; count: number }[];
  fastTrackCount: number;
  approvalRate: number;
}

export interface VirtualWardsSummaryData {
  enrolledCount: number;
  dischargedCount: number;
  alertsTotal: number;
  alertsByStatus: { status: string; count: number }[];
  alertsBySeverity: { severity: string; count: number }[];
  totalObservations: number;
}

interface ReportParams {
  startDate?: string;
  endDate?: string;
}

function buildQuery(params: ReportParams): string {
  const query = new URLSearchParams();
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export function useReports() {
  const getPatientCensus = useCallback(
    (params: ReportParams = {}): Promise<PatientCensusData> =>
      api.get(`/reports/patient-census${buildQuery(params)}`),
    [],
  );

  const getBedOccupancy = useCallback(
    (): Promise<BedOccupancyData> => api.get('/reports/bed-occupancy'),
    [],
  );

  const getWorkforceCompliance = useCallback(
    (params: ReportParams = {}): Promise<WorkforceComplianceData> =>
      api.get(`/reports/workforce-compliance${buildQuery(params)}`),
    [],
  );

  const getCarePlanReviews = useCallback(
    (): Promise<CarePlanReviewsData> => api.get('/reports/care-plan-reviews'),
    [],
  );

  const getChcPipeline = useCallback(
    (): Promise<ChcPipelineData> => api.get('/reports/chc-pipeline'),
    [],
  );

  const getVirtualWardsSummary = useCallback(
    (): Promise<VirtualWardsSummaryData> => api.get('/reports/virtual-wards-summary'),
    [],
  );

  const downloadCsv = useCallback(
    async (endpoint: string, filename: string, params: ReportParams = {}) => {
      const query = new URLSearchParams();
      if (params.startDate) query.set('startDate', params.startDate);
      if (params.endDate) query.set('endDate', params.endDate);
      query.set('format', 'csv');
      const token = localStorage.getItem('access_token');
      const tenantId = api.getTenantId();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (tenantId) headers['X-Tenant-Id'] = tenantId;
      const res = await fetch(`/api/reports/${endpoint}?${query.toString()}`, { headers });
      if (!res.ok) throw new Error('Failed to download CSV');
      const csv = await res.text();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [],
  );

  return {
    getPatientCensus,
    getBedOccupancy,
    getWorkforceCompliance,
    getCarePlanReviews,
    getChcPipeline,
    getVirtualWardsSummary,
    downloadCsv,
  };
}
