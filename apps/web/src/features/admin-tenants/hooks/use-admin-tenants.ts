import { useCallback, useState } from 'react';
import { api } from '../../../lib/api-client';

export type VerificationStatus = 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';

export interface PendingTenantRow {
  id: string;
  name: string;
  type: string;
  email: string | null;
  odsCode: string | null;
  companiesHouseNumber: string | null;
  cqcProviderId: string | null;
  verificationStatus: VerificationStatus;
  verificationNotes: string | null;
  createdAt: string;
  subscription: { tier: string; status: string; trialEndsAt: string | null } | null;
}

export interface TenantDetail extends PendingTenantRow {
  phone: string | null;
  addressLine1: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  verifiedAt: string | null;
  verifiedById: string | null;
  verifiedBy: { id: string; email: string; firstName: string; lastName: string } | null;
  auditLogs: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    user: { id: string; email: string; firstName: string; lastName: string } | null;
  }>;
}

export function useAdminTenants() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listPending = useCallback(async (): Promise<PendingTenantRow[]> => {
    setLoading(true);
    setError(null);
    try {
      return await api.get<PendingTenantRow[]>('/admin/tenants/pending-verification');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load pending tenants';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDetail = useCallback((id: string) => api.get<TenantDetail>(`/admin/tenants/${id}`), []);

  const updateIdentity = useCallback(
    (
      id: string,
      data: {
        companiesHouseNumber?: string;
        cqcProviderId?: string;
        odsCode?: string;
        verificationNotes?: string;
      },
    ) => api.patch<unknown>(`/admin/tenants/${id}/identity`, data),
    [],
  );

  const verify = useCallback(
    (id: string, notes?: string) => api.post<unknown>(`/admin/tenants/${id}/verify`, { notes }),
    [],
  );

  const reject = useCallback(
    (id: string, reason: string) => api.post<unknown>(`/admin/tenants/${id}/reject`, { reason }),
    [],
  );

  return { listPending, getDetail, updateIdentity, verify, reject, loading, error };
}
