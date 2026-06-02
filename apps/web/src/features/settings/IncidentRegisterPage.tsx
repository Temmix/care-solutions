import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api-client';
import { ErrorAlert } from '../../components/ErrorAlert';
import { useAuth } from '../../hooks/use-auth';

interface Incident {
  id: string;
  reference: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  discoveredAt: string;
  icoReportable: boolean;
  icoReportedAt: string | null;
  icoReportOverdue: boolean;
}

const CATEGORIES = [
  'DATA_BREACH',
  'UNAUTHORISED_ACCESS',
  'DATA_LOSS',
  'LOST_OR_STOLEN_DEVICE',
  'MISDIRECTED_COMMUNICATION',
  'SYSTEM_OUTAGE',
  'MALWARE_OR_PHISHING',
  'OTHER',
];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'CLOSED'];

const humanise = (v: string): string =>
  v
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const severityClass: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-amber-50 text-amber-700',
  HIGH: 'bg-orange-50 text-orange-700',
  CRITICAL: 'bg-red-50 text-red-700',
};

const inputClass =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent';

export function IncidentRegisterPage(): React.ReactElement {
  const { currentRole, isSuperAdmin, isTenantAdmin } = useAuth();
  const canManage =
    isSuperAdmin || isTenantAdmin || currentRole === 'ADMIN' || currentRole === 'TENANT_ADMIN';

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    severity: 'MEDIUM',
    icoReportable: false,
  });

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Incident[]>('/incidents')
      .then((data) => {
        setIncidents(data);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load incidents'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (canManage) load();
    else setLoading(false);
  }, [canManage, load]);

  const createIncident = async (): Promise<void> => {
    if (!form.title.trim() || !form.description.trim()) return;
    setBusy(true);
    try {
      await api.post('/incidents', form);
      toast.success('Incident logged');
      setShowForm(false);
      setForm({
        title: '',
        description: '',
        category: CATEGORIES[0],
        severity: 'MEDIUM',
        icoReportable: false,
      });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to log incident');
    } finally {
      setBusy(false);
    }
  };

  const patchIncident = async (id: string, body: Record<string, unknown>): Promise<void> => {
    setBusy(true);
    try {
      await api.patch(`/incidents/${id}`, body);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <ErrorAlert
          variant="warning"
          message="You need administrator access to manage incidents."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incident Register</h1>
          <p className="text-sm text-slate-500 mt-1">
            Log and manage security & data-protection incidents (NHS DSPT / ICO reporting).
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="shrink-0 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium cursor-pointer"
        >
          Log incident
        </button>
      </div>

      {error && <ErrorAlert message={error} className="mb-4" onDismiss={() => setError('')} />}

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
      ) : incidents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-sm text-slate-400">
          No incidents recorded.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                {['Reference', 'Title', 'Category', 'Severity', 'Status', 'ICO', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">{i.reference}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{i.title}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{humanise(i.category)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full text-xs font-medium px-2 py-0.5 ${severityClass[i.severity] ?? ''}`}
                    >
                      {humanise(i.severity)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Status for ${i.reference}`}
                      value={i.status}
                      disabled={busy}
                      onChange={(e) => patchIncident(i.id, { status: e.target.value })}
                      className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {humanise(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {i.icoReportedAt ? (
                      <span className="text-emerald-700">Reported</span>
                    ) : i.icoReportOverdue ? (
                      <span className="text-red-600 font-medium">Overdue</span>
                    ) : i.icoReportable ? (
                      <span className="text-amber-700">Due</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {i.icoReportable && !i.icoReportedAt && (
                      <button
                        onClick={() => patchIncident(i.id, { icoReported: true })}
                        disabled={busy}
                        className="px-3 py-1 border border-slate-200 text-slate-600 rounded-lg text-xs cursor-pointer hover:bg-slate-50 disabled:opacity-50"
                      >
                        Mark ICO reported
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Log incident</h2>
            <div className="space-y-3">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Title"
                className={inputClass}
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What happened?"
                rows={3}
                className={inputClass}
              />
              <select
                aria-label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {humanise(c)}
                  </option>
                ))}
              </select>
              <select
                aria-label="Severity"
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className={inputClass}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {humanise(s)}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.icoReportable}
                  onChange={(e) => setForm({ ...form, icoReportable: e.target.checked })}
                />
                Reportable to the ICO (72-hour deadline)
              </label>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm cursor-pointer hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={createIncident}
                disabled={busy || !form.title.trim() || !form.description.trim()}
                className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save incident'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
