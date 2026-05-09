import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAdminTrials, type TrialRow } from './hooks/use-admin-trials';
import { ErrorAlert } from '../../components/ErrorAlert';

type ActionMode = { kind: 'extend' | 'cancel'; row: TrialRow } | null;

export function TrialsPage(): React.ReactElement {
  const { list, extend, cancel, error } = useAdminTrials();
  const [rows, setRows] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<ActionMode>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await list());
    } catch {
      // error surfaced via hook state
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleExtend = async (row: TrialRow, days: number, reason: string) => {
    try {
      await extend(row.organizationId, days, reason || undefined);
      toast.success(`Extended ${row.organization.name} by ${days} day${days === 1 ? '' : 's'}`);
      setAction(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to extend trial');
    }
  };

  const handleCancel = async (row: TrialRow, reason: string) => {
    try {
      await cancel(row.organizationId, reason || undefined);
      toast.success(`Cancelled trial for ${row.organization.name}`);
      setAction(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel trial');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Active trials</h1>
        <p className="text-sm text-slate-500 mt-1">
          All organisations currently on a trial subscription. Extend, cancel, or click a row for
          tenant detail.
        </p>
      </header>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-slate-200">
          No active trials.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs font-medium text-slate-500 uppercase">
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Days left</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.organizationId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/app/admin/tenants/${row.organizationId}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {row.organization.name}
                    </Link>
                    <div className="text-xs text-slate-500">{row.organization.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.organization.type}</td>
                  <td className="px-4 py-3 text-slate-600">{row.tier}</td>
                  <td className="px-4 py-3">
                    <DaysBadge days={row.daysRemaining} />
                  </td>
                  <td className="px-4 py-3">
                    <VerificationBadge status={row.organization.verificationStatus} />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setAction({ kind: 'extend', row })}
                      className="text-blue-600 hover:underline mr-3"
                    >
                      Extend
                    </button>
                    <button
                      onClick={() => setAction({ kind: 'cancel', row })}
                      className="text-red-600 hover:underline"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {action?.kind === 'extend' && (
        <ExtendModal
          row={action.row}
          onClose={() => setAction(null)}
          onConfirm={(days, reason) => handleExtend(action.row, days, reason)}
        />
      )}
      {action?.kind === 'cancel' && (
        <CancelModal
          row={action.row}
          onClose={() => setAction(null)}
          onConfirm={(reason) => handleCancel(action.row, reason)}
        />
      )}
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────

function DaysBadge({ days }: { days: number | null }): React.ReactElement {
  if (days === null) return <span className="text-slate-400">—</span>;
  const cls =
    days <= 1
      ? 'bg-red-100 text-red-700'
      : days <= 7
        ? 'bg-amber-100 text-amber-700'
        : 'bg-emerald-100 text-emerald-700';
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>
      {days} day{days === 1 ? '' : 's'}
    </span>
  );
}

function VerificationBadge({
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
    <span className={`px-2 py-1 rounded text-xs font-medium ${map[status]}`}>
      {status.replace('_', ' ').toLowerCase()}
    </span>
  );
}

interface ExtendProps {
  row: TrialRow;
  onClose: () => void;
  onConfirm: (days: number, reason: string) => void;
}

function ExtendModal({ row, onClose, onConfirm }: ExtendProps): React.ReactElement {
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Extend trial — {row.organization.name}</h2>
        <label className="block text-sm font-medium text-slate-700 mb-1">Additional days</label>
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
          placeholder="e.g. Sales conversation with NHS Trust X"
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
            Extend by {days} day{days === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CancelProps {
  row: TrialRow;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

function CancelModal({ row, onClose, onConfirm }: CancelProps): React.ReactElement {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">Cancel trial — {row.organization.name}</h2>
        <p className="text-sm text-slate-600 mb-4">
          The tenant will be downgraded to FREE immediately and admins notified. This cannot be
          undone but a new trial can be granted afterward.
        </p>
        <label className="block text-sm font-medium text-slate-700 mb-1">Reason (optional)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="e.g. Abuse, GDPR request, etc."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Keep trial
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Cancel trial
          </button>
        </div>
      </div>
    </div>
  );
}
