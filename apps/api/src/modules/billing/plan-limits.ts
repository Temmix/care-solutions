export interface PlanLimits {
  patientLimit: number;
  userLimit: number;
  label: string;
  priceMonthlyGBP: number;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: { patientLimit: 5, userLimit: 1, label: 'Free', priceMonthlyGBP: 0 },
  STARTER: { patientLimit: 200, userLimit: 20, label: 'Starter', priceMonthlyGBP: 59 },
  PROFESSIONAL: { patientLimit: 500, userLimit: 50, label: 'Professional', priceMonthlyGBP: 99 },
  ENTERPRISE: { patientLimit: -1, userLimit: -1, label: 'Enterprise', priceMonthlyGBP: 299 },
};

/** -1 means unlimited */
export function isWithinLimit(current: number, limit: number): boolean {
  return limit === -1 || current < limit;
}
