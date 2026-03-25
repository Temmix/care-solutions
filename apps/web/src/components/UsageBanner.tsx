import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api-client';

export interface UsageData {
  users: { current: number; limit: number };
  patients: { current: number; limit: number };
  tier: string;
  trial?: {
    active: boolean;
    endsAt: string;
    daysRemaining: number;
  };
}

export function useUsage(): { usage: UsageData | null; refresh: () => void } {
  const [usage, setUsage] = useState<UsageData | null>(null);

  const refresh = useCallback(() => {
    api
      .get<UsageData>('/billing/usage')
      .then(setUsage)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { usage, refresh };
}

const TIER_LABELS: Record<string, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

function UsageBar({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number;
}): React.ReactElement {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && current >= limit;

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span
          className={`text-xs font-medium ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-slate-500'}`}
        >
          {current} / {isUnlimited ? 'Unlimited' : limit}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-accent'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function UsageBanner({
  show,
  usage: usageProp,
}: {
  show: 'users' | 'patients' | 'both';
  usage?: UsageData | null;
}): React.ReactElement | null {
  const [internalUsage, setInternalUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    if (!usageProp) {
      api
        .get<UsageData>('/billing/usage')
        .then(setInternalUsage)
        .catch(() => {});
    }
  }, [usageProp]);

  const usage = usageProp ?? internalUsage;
  if (!usage) return null;

  const isAtUserLimit = usage.users.limit !== -1 && usage.users.current >= usage.users.limit;
  const isAtPatientLimit =
    usage.patients.limit !== -1 && usage.patients.current >= usage.patients.limit;
  const showUpgrade =
    (show !== 'patients' && isAtUserLimit) || (show !== 'users' && isAtPatientLimit);

  const trialExpired = usage.trial && !usage.trial.active;
  const trialUrgent = usage.trial?.active && usage.trial.daysRemaining <= 7;

  return (
    <div className="mb-6 bg-white rounded-xl border border-slate-100 p-4">
      {/* Trial countdown banner */}
      {usage.trial && (
        <div
          className={`flex items-center justify-between mb-3 p-3 rounded-lg ${
            trialExpired ? 'bg-red-50' : trialUrgent ? 'bg-amber-50' : 'bg-blue-50'
          }`}
        >
          <div>
            <span
              className={`text-sm font-medium ${
                trialExpired ? 'text-red-900' : trialUrgent ? 'text-amber-900' : 'text-blue-900'
              }`}
            >
              {trialExpired
                ? 'Your Professional trial has ended'
                : `Professional Trial — ${usage.trial.daysRemaining} day${usage.trial.daysRemaining === 1 ? '' : 's'} remaining`}
            </span>
            <p
              className={`text-xs mt-0.5 ${
                trialExpired ? 'text-red-700' : trialUrgent ? 'text-amber-700' : 'text-blue-700'
              }`}
            >
              {trialExpired
                ? 'Upgrade to keep Professional features and higher limits.'
                : 'You have full access to Professional features. Upgrade before your trial ends to keep them.'}
            </p>
          </div>
          <a
            href="/app/billing"
            className={`text-xs font-medium px-3 py-1.5 rounded-lg no-underline shrink-0 ml-4 ${
              trialExpired
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-accent text-white hover:bg-accent/90'
            }`}
          >
            Upgrade Now
          </a>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-900">
          {usage.trial?.active ? 'Professional Trial' : (TIER_LABELS[usage.tier] ?? usage.tier)}{' '}
          Plan Usage
        </span>
        {showUpgrade && !usage.trial && (
          <a
            href="/app/billing"
            className="text-xs text-accent font-medium no-underline hover:underline"
          >
            Upgrade Plan
          </a>
        )}
      </div>
      <div className="flex gap-6">
        {show !== 'patients' && (
          <UsageBar label="Team Members" current={usage.users.current} limit={usage.users.limit} />
        )}
        {show !== 'users' && (
          <UsageBar
            label="Patients"
            current={usage.patients.current}
            limit={usage.patients.limit}
          />
        )}
      </div>
    </div>
  );
}
