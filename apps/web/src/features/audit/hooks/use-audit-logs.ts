import { useCallback } from 'react';
import { api } from '../../../lib/api-client';

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
}

export interface AuditSearchResult {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface ComplianceSummary {
  totalActions: number;
  actionsByDay: { date: string; count: number }[];
  topUsers: { userId: string; name: string; count: number }[];
  resourceBreakdown: { resource: string; count: number }[];
  actionBreakdown: { action: string; count: number }[];
}

interface SearchParams {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export function useAuditLogs() {
  const searchLogs = useCallback(async (params: SearchParams = {}): Promise<AuditSearchResult> => {
    const query = new URLSearchParams();
    if (params.userId) query.set('userId', params.userId);
    if (params.action) query.set('action', params.action);
    if (params.resource) query.set('resource', params.resource);
    if (params.resourceId) query.set('resourceId', params.resourceId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api.get<AuditSearchResult>(`/audit/logs${qs ? `?${qs}` : ''}`);
  }, []);

  const getComplianceSummary = useCallback(
    async (startDate?: string, endDate?: string): Promise<ComplianceSummary> => {
      const query = new URLSearchParams();
      if (startDate) query.set('startDate', startDate);
      if (endDate) query.set('endDate', endDate);
      const qs = query.toString();
      return api.get<ComplianceSummary>(`/audit/compliance${qs ? `?${qs}` : ''}`);
    },
    [],
  );

  return { searchLogs, getComplianceSummary };
}
