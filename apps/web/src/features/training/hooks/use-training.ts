import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

export interface TrainingCertificate {
  id: string;
  name: string;
  issuer: string;
  certificateNumber: string | null;
  issueDate: string;
  expiryDate: string | null;
  createdAt: string;
}

export interface TrainingRecord {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  provider: string | null;
  scheduledDate: string | null;
  startedDate: string | null;
  completedDate: string | null;
  expiryDate: string | null;
  renewalPeriodMonths: number | null;
  hoursCompleted: number | null;
  score: number | null;
  notes: string | null;
  user: { id: string; firstName: string; lastName: string; role: string };
  createdBy: { id: string; firstName: string; lastName: string };
  certificates: TrainingCertificate[];
  createdAt: string;
  updatedAt: string;
}

export interface TrainingSummary {
  totalRecords: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  mandatoryTotal: number;
  mandatoryCompleted: number;
  compliancePercentage: number;
  expiringCount: number;
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface SearchParams {
  userId?: string;
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TrainingType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
}

export function useTraining() {
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

  const listTrainingRecords = useCallback(
    (params?: SearchParams) => {
      const query = new URLSearchParams();
      if (params?.userId) query.set('userId', params.userId);
      if (params?.status) query.set('status', params.status);
      if (params?.category) query.set('category', params.category);
      if (params?.priority) query.set('priority', params.priority);
      if (params?.search) query.set('search', params.search);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      const qs = query.toString();
      return wrap(() => api.get<Paginated<TrainingRecord>>(`/training${qs ? `?${qs}` : ''}`));
    },
    [wrap],
  );

  const getTrainingRecord = useCallback(
    (id: string) => wrap(() => api.get<TrainingRecord>(`/training/${id}`)),
    [wrap],
  );

  const getMyTraining = useCallback(
    () => wrap(() => api.get<TrainingRecord[]>('/training/me')),
    [wrap],
  );

  const createTrainingRecord = useCallback(
    (data: Record<string, unknown>) => wrap(() => api.post<TrainingRecord>('/training', data)),
    [wrap],
  );

  const updateTrainingRecord = useCallback(
    (id: string, data: Record<string, unknown>) =>
      wrap(() => api.patch<TrainingRecord>(`/training/${id}`, data)),
    [wrap],
  );

  const deleteTrainingRecord = useCallback(
    (id: string) => wrap(() => api.delete(`/training/${id}`)),
    [wrap],
  );

  const addCertificate = useCallback(
    (trainingId: string, data: Record<string, unknown>) =>
      wrap(() => api.post<TrainingCertificate>(`/training/${trainingId}/certificates`, data)),
    [wrap],
  );

  const updateCertificate = useCallback(
    (trainingId: string, certId: string, data: Record<string, unknown>) =>
      wrap(() =>
        api.patch<TrainingCertificate>(`/training/${trainingId}/certificates/${certId}`, data),
      ),
    [wrap],
  );

  const deleteCertificate = useCallback(
    (trainingId: string, certId: string) =>
      wrap(() => api.delete(`/training/${trainingId}/certificates/${certId}`)),
    [wrap],
  );

  const getTrainingSummary = useCallback(
    () => wrap(() => api.get<TrainingSummary>('/training/summary')),
    [wrap],
  );

  const getExpiringTraining = useCallback(
    (days = 30) => wrap(() => api.get<TrainingRecord[]>(`/training/expiring?days=${days}`)),
    [wrap],
  );

  const getTrainingTypes = useCallback(
    () => wrap(() => api.get<TrainingType[]>('/training-types')),
    [wrap],
  );

  return {
    loading,
    error,
    listTrainingRecords,
    getTrainingRecord,
    getMyTraining,
    createTrainingRecord,
    updateTrainingRecord,
    deleteTrainingRecord,
    addCertificate,
    updateCertificate,
    deleteCertificate,
    getTrainingSummary,
    getExpiringTraining,
    getTrainingTypes,
  };
}
