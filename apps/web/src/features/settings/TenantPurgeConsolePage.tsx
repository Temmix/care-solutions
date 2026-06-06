import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api-client';
import { ErrorAlert } from '../../components/ErrorAlert';
import { useAuth } from '../../hooks/use-auth';

interface Candidate {
  tenantId: string;
  name: string;
  terminatedAt: string;
  purgeDueAt: string;
  daysSinceDue: number;
}

interface PurgeCounts {
  patients: number;
  encounters: number;
  chcCases: number;
  virtualWardEnrolments: number;
}

const inputClass =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent';

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function TenantPurgeConsolePage(): React.ReactElement {
  const { isSuperAdmin } = useAuth();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [preview, setPreview] = useState<PurgeCounts | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Candidate[]>('/tenant-purge/candidates')
      .then((data) => {
        setCandidates(data);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load candidates'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isSuperAdmin) load();
    else setLoading(false);
  }, [isSuperAdmin, load]);

  const openModal = (c: Candidate): void => {
    setSelected(c);
    setReason('');
    setConfirmation('');
    setPreview(null);
  };

  const runDryRun = async (): Promise<void> => {
    if (!selected || !reason.trim()) return;
    setBusy(true);
    try {
      const res = await api.post<{ counts: PurgeCounts }>(
        `/tenant-purge/${selected.tenantId}/execute`,
        { confirmation: selected.tenantId, reason: reason.trim(), dryRun: true },
      );
      setPreview(res.counts);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Dry run failed');
    } finally {
      setBusy(false);
    }
  };

  const executePurge = async (): Promise<void> => {
    if (!selected || confirmation !== selected.tenantId || !reason.trim()) return;
    setBusy(true);
    try {
      await api.post(`/tenant-purge/${selected.tenantId}/execute`, {
        confirmation,
        reason: reason.trim(),
        dryRun: false,
      });
      toast.success('Tenant data purged');
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Purge failed');
    } finally {
      setBusy(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <ErrorAlert
          variant="warning"
          message="This console is restricted to platform administrators."
        />
      </div>
    );
  }

  const canPurge =
    selected !== null && confirmation === selected.tenantId && reason.trim().length > 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tenant Data Purge</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tenants past the post-termination grace window, eligible for permanent data deletion.
        </p>
      </div>

      {error && <ErrorAlert message={error} className="mb-4" onDismiss={() => setError('')} />}

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
      ) : candidates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-sm text-slate-400">
          No tenants are eligible for purge.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                {['Tenant', 'Terminated', 'Eligible since', 'Overdue', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.tenantId} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {c.name}
                    <div className="text-xs font-mono text-slate-400">{c.tenantId}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(c.terminatedAt)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(c.purgeDueAt)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{c.daysSinceDue}d</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openModal(c)}
                      className="px-3 py-1 border border-red-200 text-red-600 rounded-lg text-xs cursor-pointer hover:bg-red-50"
                    >
                      Review &amp; purge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Purge tenant data</h2>
            <p className="text-sm text-slate-600 mb-3">
              Permanently delete all patient data for{' '}
              <span className="font-medium">{selected.name}</span>. This cannot be undone.
            </p>

            <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Contract terminated; data retention expired"
              className={`${inputClass} mb-3`}
            />

            <button
              onClick={runDryRun}
              disabled={busy || !reason.trim()}
              className="mb-4 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm cursor-pointer hover:bg-slate-50 disabled:opacity-50"
            >
              {busy && !preview ? 'Running…' : 'Preview impact (dry run)'}
            </button>

            {preview && (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                Would delete: {preview.patients} patients, {preview.encounters} encounters,{' '}
                {preview.chcCases} CHC cases, {preview.virtualWardEnrolments} virtual-ward
                enrolments.
              </div>
            )}

            <label className="block text-xs font-medium text-slate-600 mb-1">
              Type the tenant ID to confirm
            </label>
            <p className="font-mono text-xs text-slate-400 mb-1 break-all">{selected.tenantId}</p>
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="Tenant ID"
              className={`${inputClass} mb-5`}
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm cursor-pointer hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={executePurge}
                disabled={!canPurge || busy}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? 'Purging…' : 'Permanently delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
