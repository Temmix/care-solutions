import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

export interface PlanLimits {
  patientLimit: number;
  userLimit: number;
  label: string;
  priceMonthlyGBP: number;
}

export interface Plan {
  tier: string;
  patientLimit: number;
  userLimit: number;
  label: string;
  priceMonthlyGBP: number;
  priceId: string | null;
}

export interface Subscription {
  id: string;
  organizationId: string;
  tier: string;
  status: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  patientLimit: number;
  userLimit: number;
  limits: PlanLimits;
  organization: { name: string; stripeCustomerId: string | null };
}

export function useBilling() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPlans = useCallback(async (): Promise<Plan[]> => {
    return api.get<Plan[]>('/billing/plans');
  }, []);

  const getSubscription = useCallback(async (): Promise<Subscription> => {
    setLoading(true);
    setError(null);
    try {
      return await api.get<Subscription>('/billing/subscription');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load subscription';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCheckout = useCallback(async (priceId: string): Promise<{ url: string }> => {
    return api.post<{ url: string }>('/billing/checkout', {
      priceId,
      returnUrl: `${window.location.origin}/billing`,
    });
  }, []);

  const openPortal = useCallback(async (): Promise<{ url: string }> => {
    return api.post<{ url: string }>('/billing/portal', {
      returnUrl: `${window.location.origin}/billing`,
    });
  }, []);

  return { getPlans, getSubscription, createCheckout, openPortal, loading, error };
}
