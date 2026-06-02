import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api-client';
import { ErrorAlert } from '../../components/ErrorAlert';
import { useAuth } from '../../hooks/use-auth';

interface ProcessingSummary {
  purposes: Array<{ purpose: string; count: number }>;
  article6Bases: Array<{ basis: string; count: number }>;
  consents: Array<{ type: string; status: string; count: number }>;
}

const humanise = (v: string): string =>
  v
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

function CountCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; count: number }>;
}): React.ReactElement {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6">
      <h2 className="text-sm font-semibold text-slate-900 mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No records yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{r.label}</span>
              <span className="font-mono text-slate-500">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProcessingSummaryPage(): React.ReactElement {
  const { currentRole, isSuperAdmin, isTenantAdmin } = useAuth();
  const canManage =
    isSuperAdmin || isTenantAdmin || currentRole === 'ADMIN' || currentRole === 'TENANT_ADMIN';

  const [summary, setSummary] = useState<ProcessingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<ProcessingSummary>('/privacy/processing-summary')
      .then((s) => {
        setSummary(s);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load summary'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (canManage) load();
    else setLoading(false);
  }, [canManage, load]);

  if (!canManage) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <ErrorAlert variant="warning" message="You need administrator access to view this page." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Processing Activities</h1>
        <p className="text-sm text-slate-500 mt-1">
          A record of the lawful bases and consents in use across your organisation (UK GDPR Art.
          30).
        </p>
      </div>

      {error && <ErrorAlert message={error} className="mb-4" onDismiss={() => setError('')} />}

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CountCard
            title="By processing purpose"
            rows={summary.purposes.map((p) => ({ label: humanise(p.purpose), count: p.count }))}
          />
          <CountCard
            title="By Article 6 basis"
            rows={summary.article6Bases.map((a) => ({ label: humanise(a.basis), count: a.count }))}
          />
          <CountCard
            title="Consents"
            rows={summary.consents.map((c) => ({
              label: `${humanise(c.type)} · ${humanise(c.status)}`,
              count: c.count,
            }))}
          />
        </div>
      ) : null}
    </div>
  );
}
