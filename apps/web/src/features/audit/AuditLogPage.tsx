import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuditLogs, type AuditLogEntry } from './hooks/use-audit-logs';
import { ErrorAlert } from '../../components/ErrorAlert';

const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'VIEW'] as const;

const RESOURCES = [
  '',
  'Patient',
  'CarePlan',
  'Assessment',
  'MedicationRequest',
  'Encounter',
  'ChcCase',
  'VirtualWardEnrolment',
  'Shift',
  'ShiftAssignment',
  'DischargePlan',
  'Location',
  'Bed',
] as const;

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-50 text-emerald-700',
  UPDATE: 'bg-blue-50 text-blue-700',
  DELETE: 'bg-red-50 text-red-600',
  VIEW: 'bg-slate-50 text-slate-600',
};

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AuditLogPage(): React.ReactElement {
  const { searchLogs } = useAuditLogs();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const limit = 25;

  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    searchLogs({
      page,
      limit,
      action: action || undefined,
      resource: resource || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
      .then((result) => {
        setLogs(result.data);
        setTotal(result.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [searchLogs, page, action, resource, startDate, endDate]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">
            {total} record{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/app/audit/compliance"
          className="px-4 py-2 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-sm font-medium no-underline transition-colors"
        >
          Compliance Dashboard
        </Link>
      </div>

      <ErrorAlert message={error} className="mb-4" />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-4 grid grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Action</label>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none"
          >
            <option value="">All Actions</option>
            {ACTIONS.filter(Boolean).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Resource</label>
          <select
            value={resource}
            onChange={(e) => {
              setResource(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none"
          >
            <option value="">All Resources</option>
            {RESOURCES.filter(Boolean).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 font-medium text-slate-400">Timestamp</th>
              <th className="px-4 py-3 font-medium text-slate-400">User</th>
              <th className="px-4 py-3 font-medium text-slate-400">Action</th>
              <th className="px-4 py-3 font-medium text-slate-400">Resource</th>
              <th className="px-4 py-3 font-medium text-slate-400">Resource ID</th>
            </tr>
          </thead>
          <tbody>
            {loading && !logs.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-25">
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-900">
                    {log.user.firstName} {log.user.lastName}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${actionColors[log.action] ?? 'bg-slate-50 text-slate-600'}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{log.resource}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                    {log.resourceId ? log.resourceId.slice(0, 8) + '...' : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
