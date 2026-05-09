import { useCallback, useState } from 'react';
import { api } from '../../../lib/api-client';

export interface TrialRow {
  organizationId: string;
  organization: {
    id: string;
    name: string;
    type: string;
    email: string | null;
    verificationStatus: 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';
    createdAt: string;
  };
  tier: string;
  status: string;
  trialEndsAt: string | null;
  daysRemaining: number | null;
  createdAt: string;
}

export function useAdminTrials() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (): Promise<TrialRow[]> => {
    setLoading(true);
    setError(null);
    try {
      return await api.get<TrialRow[]>('/billing/trials');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load trials';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const extend = useCallback(
    (organizationId: string, additionalDays: number, reason?: string) =>
      api.post<{ subscription: unknown }>(`/billing/trials/${organizationId}/extend`, {
        additionalDays,
        reason,
      }),
    [],
  );

  const cancel = useCallback(
    (organizationId: string, reason?: string) =>
      api.post<{ ok: true }>(`/billing/trials/${organizationId}/cancel`, { reason }),
    [],
  );

  const grant = useCallback(
    (organizationId: string, durationDays: number | undefined, reason?: string) =>
      api.post<{ subscription: unknown }>(`/billing/trials/${organizationId}/grant`, {
        durationDays,
        reason,
      }),
    [],
  );

  return { list, extend, cancel, grant, loading, error };
}
