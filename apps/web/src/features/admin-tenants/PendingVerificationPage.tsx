import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAdminTenants, type PendingTenantRow } from './hooks/use-admin-tenants';
import { ErrorAlert } from '../../components/ErrorAlert';

export function PendingVerificationPage(): React.ReactElement {
  const { listPending, error } = useAdminTenants();
  const [rows, setRows] = useState<PendingTenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listPending());
    } catch {
      // surfaced via hook error state
    } finally {
      setLoading(false);
    }
  }, [listPending]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Tenants pending verification</h1>
        <p className="text-sm text-slate-500 mt-1">
          Organisations awaiting identity review. Click a row to view detail and verify or reject.
        </p>
      </header>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-slate-200">
          No tenants awaiting verification.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs font-medium text-slate-500 uppercase">
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Companies House</th>
                <th className="px-4 py-3">CQC</th>
                <th className="px-4 py-3">ODS</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Signed up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/app/admin/tenants/${r.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {r.name}
                    </Link>
                    <div className="text-xs text-slate-500">{r.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.type}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {r.companiesHouseNumber || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {r.cqcProviderId || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {r.odsCode || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        r.verificationStatus === 'PENDING_REVIEW'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r.verificationStatus.replace('_', ' ').toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(r.createdAt).toLocaleDateString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
