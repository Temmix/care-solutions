import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { useBilling, type Plan, type Subscription } from './hooks/use-billing';
import { ErrorAlert } from '../../components/ErrorAlert';

const tierOrder = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

const tierColors: Record<string, string> = {
  FREE: 'border-slate-200',
  STARTER: 'border-blue-300 ring-1 ring-blue-100',
  PROFESSIONAL: 'border-accent ring-2 ring-accent/20',
  ENTERPRISE: 'border-purple-300 ring-1 ring-purple-100',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  TRIALING: 'bg-blue-50 text-blue-700',
  PAST_DUE: 'bg-amber-50 text-amber-700',
  CANCELED: 'bg-red-50 text-red-600',
  UNPAID: 'bg-red-50 text-red-600',
  INCOMPLETE: 'bg-amber-50 text-amber-700',
};

function formatLimit(limit: number): string {
  return limit === -1 ? 'Unlimited' : limit.toString();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function BillingPage(): React.ReactElement {
  const { isSuperAdmin, selectedTenant } = useAuth();
  const { getPlans, getSubscription, createCheckout, openPortal, loading, error } = useBilling();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subError, setSubError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [planData, subData] = await Promise.all([getPlans(), getSubscription()]);
      setPlans(planData);
      setSubscription(subData);
      setSubError('');
    } catch (err) {
      // subscription may not exist yet
      try {
        const planData = await getPlans();
        setPlans(planData);
      } catch {
        // plans endpoint doesn't require auth, shouldn't fail
      }
      setSubError(err instanceof Error ? err.message : 'Failed to load billing data');
    }
  }, [getPlans, getSubscription]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectPlan = async (plan: Plan) => {
    if (!plan.priceId) return;
    setActionLoading(plan.tier);
    try {
      const { url } = await createCheckout(plan.priceId);
      if (url) window.location.href = url;
    } catch (err) {
      setSubError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setActionLoading('portal');
    try {
      const { url } = await openPortal();
      if (url) window.location.href = url;
    } catch (err) {
      setSubError(err instanceof Error ? err.message : 'Failed to open billing portal');
    } finally {
      setActionLoading(null);
    }
  };

  // SUPER_ADMIN without tenant selected
  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 text-center py-16">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Select a Tenant First</h2>
        <p className="text-slate-500 text-sm">
          Choose a tenant from the Tenants page to manage their billing.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Billing & Subscription</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your plan, view usage limits, and update payment details
        </p>
      </div>

      {/* Error */}
      <ErrorAlert message={error || subError} className="mb-6" />

      {/* Current Subscription Card */}
      {subscription && (
        <div className="bg-white rounded-xl border border-slate-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Current Plan</h2>
            {subscription.stripeSubscriptionId && (
              <button
                onClick={handleManageBilling}
                disabled={actionLoading === 'portal'}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                {actionLoading === 'portal' ? 'Opening...' : 'Manage Billing'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">Plan</div>
              <div className="text-sm font-semibold text-slate-900">
                {subscription.limits.label}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Status</div>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[subscription.status] ?? 'bg-slate-100 text-slate-600'}`}
              >
                {subscription.status}
              </span>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Patient Limit</div>
              <div className="text-sm font-medium text-slate-900">
                {formatLimit(subscription.patientLimit)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">User Limit</div>
              <div className="text-sm font-medium text-slate-900">
                {formatLimit(subscription.userLimit)}
              </div>
            </div>
          </div>

          {subscription.currentPeriodEnd && (
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
              {subscription.cancelAtPeriodEnd ? (
                <span className="text-amber-600">
                  Cancels on {formatDate(subscription.currentPeriodEnd)}
                </span>
              ) : (
                <span>Renews on {formatDate(subscription.currentPeriodEnd)}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && !subscription && (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400 text-sm">Loading billing information...</div>
        </div>
      )}

      {/* Plans Grid */}
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans
          .sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier))
          .map((plan) => {
            const isCurrent = subscription?.tier === plan.tier;
            const isUpgrade =
              subscription && tierOrder.indexOf(plan.tier) > tierOrder.indexOf(subscription.tier);
            const isDowngrade =
              subscription && tierOrder.indexOf(plan.tier) < tierOrder.indexOf(subscription.tier);

            return (
              <div
                key={plan.tier}
                className={`bg-white rounded-xl border-2 p-6 ${
                  isCurrent
                    ? 'border-accent ring-2 ring-accent/20'
                    : (tierColors[plan.tier] ?? 'border-slate-200')
                }`}
              >
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-slate-900">{plan.label}</h3>
                  <div className="mt-2">
                    {plan.priceMonthlyGBP === 0 ? (
                      <span className="text-2xl font-bold text-slate-900">Free</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-slate-900">
                          &pound;{plan.priceMonthlyGBP}
                        </span>
                        <span className="text-sm text-slate-500">/month</span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-2 mb-6 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-emerald-500 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    {formatLimit(plan.patientLimit)} patients
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-emerald-500 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    {formatLimit(plan.userLimit)} users
                  </li>
                </ul>

                {isCurrent ? (
                  <div className="text-center text-sm font-medium text-accent py-2">
                    Current Plan
                  </div>
                ) : plan.priceId ? (
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={actionLoading === plan.tier}
                    className={`w-full py-2 text-sm font-medium rounded-lg cursor-pointer disabled:opacity-50 ${
                      isUpgrade
                        ? 'bg-accent text-white hover:bg-accent/90'
                        : isDowngrade && subscription?.stripeSubscriptionId
                          ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                          : 'bg-accent text-white hover:bg-accent/90'
                    }`}
                  >
                    {actionLoading === plan.tier
                      ? 'Redirecting...'
                      : isDowngrade
                        ? 'Downgrade'
                        : 'Upgrade'}
                  </button>
                ) : (
                  <div className="text-center text-xs text-slate-400 py-2">
                    {plan.tier === 'FREE' ? 'Default plan' : 'Contact sales'}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
