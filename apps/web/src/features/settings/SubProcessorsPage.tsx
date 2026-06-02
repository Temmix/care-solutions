import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api-client';
import { ErrorAlert } from '../../components/ErrorAlert';
import { useAuth } from '../../hooks/use-auth';

interface SubProcessor {
  id: string;
  name: string;
  purpose: string;
  location: string;
  url: string | null;
  status: string;
  effectiveDate: string;
  announcedAt: string;
}

const inputClass =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function SubProcessorsPage(): React.ReactElement {
  const { isSuperAdmin } = useAuth();

  const [current, setCurrent] = useState<SubProcessor[]>([]);
  const [changes, setChanges] = useState<SubProcessor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', purpose: '', location: '', url: '' });

  const now = Date.now();
  const upcoming = changes.filter((c) => new Date(c.effectiveDate).getTime() > now);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<SubProcessor[]>('/sub-processors'),
      api.get<SubProcessor[]>('/sub-processors/changes'),
    ])
      .then(([c, ch]) => {
        setCurrent(c);
        setChanges(ch);
        setError('');
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load sub-processors'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const addSubProcessor = async (): Promise<void> => {
    if (!form.name.trim() || !form.purpose.trim() || !form.location.trim()) return;
    setBusy(true);
    try {
      await api.post('/sub-processors', {
        name: form.name,
        purpose: form.purpose,
        location: form.location,
        url: form.url.trim() || undefined,
      });
      toast.success('Sub-processor added (notice period started)');
      setShowForm(false);
      setForm({ name: '', purpose: '', location: '', url: '' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add');
    } finally {
      setBusy(false);
    }
  };

  const removeSubProcessor = async (id: string): Promise<void> => {
    setBusy(true);
    try {
      await api.patch(`/sub-processors/${id}`, { status: 'REMOVED' });
      toast.success('Removal announced (notice period started)');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sub-processors</h1>
          <p className="text-sm text-slate-500 mt-1">
            Third parties that may process data on Clinvara's behalf, and any upcoming changes.
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium cursor-pointer"
          >
            Add sub-processor
          </button>
        )}
      </div>

      {error && <ErrorAlert message={error} className="mb-4" onDismiss={() => setError('')} />}

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h2 className="text-sm font-semibold text-amber-800 mb-1">Upcoming changes</h2>
              <ul className="text-sm text-amber-800 space-y-0.5">
                {upcoming.map((c) => (
                  <li key={c.id}>
                    <span className="font-medium">{c.name}</span> —{' '}
                    {c.status === 'REMOVED' ? 'being removed' : 'being added'} on{' '}
                    {formatDate(c.effectiveDate)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {current.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-sm text-slate-400">
              No sub-processors recorded.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Name', 'Purpose', 'Location', ''].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold text-slate-500 px-4 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {current.map((sp) => (
                    <tr key={sp.id} className="border-b border-slate-100">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {sp.url ? (
                          <a
                            href={sp.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:underline"
                          >
                            {sp.name}
                          </a>
                        ) : (
                          sp.name
                        )}
                        {sp.status === 'REMOVED' && (
                          <span className="ml-2 inline-flex rounded-full bg-amber-50 text-amber-700 text-xs px-2 py-0.5">
                            removal {formatDate(sp.effectiveDate)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{sp.purpose}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{sp.location}</td>
                      <td className="px-4 py-3 text-right">
                        {isSuperAdmin && sp.status !== 'REMOVED' && (
                          <button
                            onClick={() => removeSubProcessor(sp.id)}
                            disabled={busy}
                            className="px-3 py-1 border border-red-200 text-red-600 rounded-lg text-xs cursor-pointer hover:bg-red-50 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Add sub-processor</h2>
            <p className="text-sm text-slate-500 mb-4">
              Tenants are given advance notice; the change takes effect after the notice period.
            </p>
            <div className="space-y-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Name"
                className={inputClass}
              />
              <input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="Purpose"
                className={inputClass}
              />
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Location (e.g. UK, EU)"
                className={inputClass}
              />
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="URL (optional)"
                className={inputClass}
              />
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm cursor-pointer hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={addSubProcessor}
                disabled={
                  busy || !form.name.trim() || !form.purpose.trim() || !form.location.trim()
                }
                className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
