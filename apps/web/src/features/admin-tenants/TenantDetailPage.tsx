import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAdminTenants, type TenantDetail } from './hooks/use-admin-tenants';
import { useAdminTrials } from '../admin-trials/hooks/use-admin-trials';
import { ErrorAlert } from '../../components/ErrorAlert';

type ActionMode = 'verify' | 'reject' | 'reset' | 'extend' | 'cancel' | 'grant' | null;

export function TenantDetailPage(): React.ReactElement {
  const { id = '' } = useParams<{ id: string }>();
  const { getDetail, verify, reject, resetVerification } = useAdminTenants();
  const { extend, cancel, grant } = useAdminTrials();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionMode>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTenant(await getDetail(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
    } finally {
      setLoading(false);
    }
  }, [getDetail, id]);

  useEffect(() => {
    if (id) refresh();
  }, [id, refresh]);

  const runAction = async (fn: () => Promise<unknown>, successMsg: string) => {
    try {
      await fn();
      toast.success(successMsg);
      setAction(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-500">Loading…</div>;
  if (error || !tenant)
    return (
      <div className="p-6">
        <ErrorAlert message={error || 'Tenant not found'} />
      </div>
    );

  const sub = tenant.subscription;
  const isTrialing = sub?.status === 'TRIALING';
  const isFree = sub?.tier === 'FREE' && sub?.status === 'ACTIVE';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Link to="/app/admin/tenants" className="hover:underline">
            Pending verification
          </Link>
          <span>›</span>
          <span>{tenant.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">{tenant.name}</h1>
          <VerificationStatus status={tenant.verificationStatus} />
        </div>
      </header>

      {/* Identity card */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Identity</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Type">{tenant.type}</Field>
          <Field label="Email">{tenant.email}</Field>
          <Field label="Phone">{tenant.phone}</Field>
          <Field label="Country">{tenant.country}</Field>
          <Field label="Address">
            {[tenant.addressLine1, tenant.city, tenant.postalCode].filter(Boolean).join(', ') ||
              null}
          </Field>
          <Field label="Companies House">
            <code className="text-xs">{tenant.companiesHouseNumber}</code>
          </Field>
          <Field label="CQC Provider ID">
            <code className="text-xs">{tenant.cqcProviderId}</code>
          </Field>
          <Field label="ODS code">
            <code className="text-xs">{tenant.odsCode}</code>
          </Field>
        </dl>

        <div className="mt-6 flex gap-2">
          {tenant.verificationStatus !== 'VERIFIED' && (
            <button
              onClick={() => setAction('verify')}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Verify
            </button>
          )}
          {tenant.verificationStatus !== 'REJECTED' && (
            <button
              onClick={() => setAction('reject')}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reject
            </button>
          )}
          {tenant.verificationStatus !== 'UNVERIFIED' && (
            <button
              onClick={() => setAction('reset')}
              className="px-4 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
            >
              Reset to unverified
            </button>
          )}
        </div>

        {tenant.verifiedBy && (
          <p className="mt-4 text-xs text-slate-500">
            Verified by {tenant.verifiedBy.firstName} {tenant.verifiedBy.lastName} on{' '}
            {tenant.verifiedAt ? new Date(tenant.verifiedAt).toLocaleString('en-GB') : '—'}
          </p>
        )}
        {tenant.verificationNotes && (
          <p className="mt-2 text-xs text-slate-600 italic">"{tenant.verificationNotes}"</p>
        )}
      </section>

      {/* Subscription / trial */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Subscription</h2>
        {sub ? (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Tier">{sub.tier}</Field>
            <Field label="Status">{sub.status}</Field>
            <Field label="Trial ends">
              {sub.trialEndsAt ? new Date(sub.trialEndsAt).toLocaleString('en-GB') : '—'}
            </Field>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">No subscription record.</p>
        )}

        <div className="mt-6 flex gap-2">
          {isTrialing && (
            <>
              <button
                onClick={() => setAction('extend')}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Extend trial
              </button>
              <button
                onClick={() => setAction('cancel')}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Cancel trial
              </button>
            </>
          )}
          {isFree && (
            <button
              onClick={() => setAction('grant')}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Grant new trial
            </button>
          )}
        </div>
      </section>

      {/* Audit log */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Audit log</h2>
        {tenant.auditLogs.length === 0 ? (
          <p className="text-sm text-slate-500">No audit entries yet.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {tenant.auditLogs.slice(0, 50).map((log) => (
              <li key={log.id} className="border-l-2 border-slate-200 pl-3">
                <div className="font-medium text-slate-700">{log.action}</div>
                <div className="text-slate-500">
                  {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'system'} ·{' '}
                  {new Date(log.createdAt).toLocaleString('en-GB')}
                </div>
                {log.metadata && (
                  <pre className="text-slate-500 bg-slate-50 rounded px-2 py-1 mt-1 overflow-x-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Modals */}
      {action === 'verify' && (
        <SimpleReasonModal
          title={`Verify ${tenant.name}`}
          desc="Mark this tenant as verified. Notes are optional and saved on the audit log."
          confirmLabel="Verify"
          confirmClass="bg-emerald-600 hover:bg-emerald-700"
          onClose={() => setAction(null)}
          onConfirm={(reason) =>
            runAction(() => verify(id, reason || undefined), 'Tenant verified')
          }
        />
      )}
      {action === 'reject' && (
        <SimpleReasonModal
          title={`Reject ${tenant.name}`}
          desc="Reason is required. The tenant won't be deleted; you can also cancel their trial separately if needed."
          confirmLabel="Reject"
          confirmClass="bg-red-600 hover:bg-red-700"
          reasonRequired
          onClose={() => setAction(null)}
          onConfirm={(reason) => runAction(() => reject(id, reason), 'Tenant rejected')}
        />
      )}
      {action === 'reset' && (
        <SimpleReasonModal
          title={`Reset verification — ${tenant.name}`}
          desc="Tenant returns to UNVERIFIED status and reappears in the verification queue. Existing notes are preserved as audit history. Use this to undo a mistaken verify or reject."
          confirmLabel="Reset to unverified"
          confirmClass="bg-slate-700 hover:bg-slate-800"
          onClose={() => setAction(null)}
          onConfirm={(reason) =>
            runAction(
              () => resetVerification(id, reason || undefined),
              'Verification reset to unverified',
            )
          }
        />
      )}
      {action === 'extend' && (
        <ExtendTrialModal
          tenantName={tenant.name}
          onClose={() => setAction(null)}
          onConfirm={(days, reason) =>
            runAction(() => extend(id, days, reason || undefined), `Trial extended by ${days} days`)
          }
        />
      )}
      {action === 'cancel' && (
        <SimpleReasonModal
          title={`Cancel trial for ${tenant.name}`}
          desc="Tenant will be downgraded to FREE and admins notified."
          confirmLabel="Cancel trial"
          confirmClass="bg-amber-600 hover:bg-amber-700"
          onClose={() => setAction(null)}
          onConfirm={(reason) =>
            runAction(() => cancel(id, reason || undefined), 'Trial cancelled')
          }
        />
      )}
      {action === 'grant' && (
        <ExtendTrialModal
          tenantName={tenant.name}
          confirmLabel="Grant trial"
          defaultDays={60}
          onClose={() => setAction(null)}
          onConfirm={(days, reason) =>
            runAction(() => grant(id, days, reason || undefined), `Granted ${days}-day trial`)
          }
        />
      )}
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <dt className="text-xs text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-slate-800">
        {children || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}

function VerificationStatus({
  status,
}: {
  status: 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';
}): React.ReactElement {
  const map: Record<typeof status, string> = {
    UNVERIFIED: 'bg-slate-100 text-slate-600',
    PENDING_REVIEW: 'bg-amber-100 text-amber-700',
    VERIFIED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-3 py-1 rounded text-sm font-medium ${map[status]}`}>
      {status.replace('_', ' ').toLowerCase()}
    </span>
  );
}

interface SimpleReasonProps {
  title: string;
  desc: string;
  confirmLabel: string;
  confirmClass: string;
  reasonRequired?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

function SimpleReasonModal({
  title,
  desc,
  confirmLabel,
  confirmClass,
  reasonRequired,
  onClose,
  onConfirm,
}: SimpleReasonProps): React.ReactElement {
  const [reason, setReason] = useState('');
  const isValid = !reasonRequired || reason.trim().length > 0;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-slate-600 mb-4">{desc}</p>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Reason {reasonRequired ? <span className="text-red-500">*</span> : '(optional)'}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Close
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!isValid}
            className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ExtendTrialProps {
  tenantName: string;
  confirmLabel?: string;
  defaultDays?: number;
  onClose: () => void;
  onConfirm: (days: number, reason: string) => void;
}

function ExtendTrialModal({
  tenantName,
  confirmLabel = 'Extend',
  defaultDays = 7,
  onClose,
  onConfirm,
}: ExtendTrialProps): React.ReactElement {
  const [days, setDays] = useState(defaultDays);
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">
          {confirmLabel} — {tenantName}
        </h2>
        <label className="block text-sm font-medium text-slate-700 mb-1">Days</label>
        <input
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value, 10) || 0)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4"
        />
        <label className="block text-sm font-medium text-slate-700 mb-1">Reason (optional)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(days, reason)}
            disabled={days < 1}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {confirmLabel} {days} day{days === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}
