import { useState, useEffect, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useAuditLogs, type AuditLogEntry } from './hooks/use-audit-logs';
import { ErrorAlert } from '../../components/ErrorAlert';

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

const ACTIONS = [
  '',
  'VIEW',
  'VIEW_TIMELINE',
  'CREATE',
  'UPDATE',
  'DELETE',
  'EXPORT',
  'ANONYMISE',
  'PURGE_TENANT',
  'GRANT_CONSENT',
  'WITHDRAW_CONSENT',
  'ACCEPT_LEGAL_DOCUMENT',
] as const;

const resourceLabels: Record<string, string> = {
  Patient: 'Patient',
  CarePlan: 'Care Plan',
  Assessment: 'Assessment',
  MedicationRequest: 'Medication Request',
  Encounter: 'Encounter',
  ChcCase: 'CHC Case',
  VirtualWardEnrolment: 'Virtual Ward Enrolment',
  Shift: 'Shift',
  ShiftAssignment: 'Shift Assignment',
  ShiftSwapRequest: 'Shift Swap',
  DischargePlan: 'Discharge Plan',
  Location: 'Location',
  Bed: 'Bed',
  User: 'User',
  Organization: 'Organisation',
  TrainingRecord: 'Training Record',
  Subscription: 'Subscription',
  Notification: 'Notification',
};

const actionLabels: Record<string, string> = {
  VIEW: 'Viewed',
  VIEW_TIMELINE: 'Viewed timeline',
  VIEW_ADMINISTRATIONS: 'Viewed medication administrations',
  VIEW_ALERTS: 'Viewed alerts',
  VIEW_DISCHARGE_PLAN: 'Viewed discharge plan',
  VIEW_DOMAIN_SCORES: 'Viewed CHC domain scores',
  VIEW_NOTES: 'Viewed notes',
  VIEW_OBSERVATIONS: 'Viewed observations',
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  DEACTIVATE: 'Deactivated',
  EXPORT: 'Exported (DSAR)',
  ANONYMISE: 'Erased / anonymised',
  PURGE_TENANT: 'Purged tenant data',
  ACCEPT_LEGAL_DOCUMENT: 'Accepted legal document',
  GRANT_CONSENT: 'Granted consent',
  WITHDRAW_CONSENT: 'Withdrew consent',
  ADMIT: 'Admitted',
  DISCHARGE: 'Discharged',
  TRANSFER: 'Transferred',
};

function formatAction(action: string): string {
  if (actionLabels[action]) return actionLabels[action];
  // Humanise unknown codes: RECORD_DECISION → "Record decision"
  const words = action.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFull(d: string): string {
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}

/** Build the human-readable subject of an audit entry. */
function describeTarget(log: AuditLogEntry): { main: string; sub?: string; patientId?: string } {
  const resLabel = resourceLabels[log.resource] ?? log.resource;
  if (log.resource === 'Patient') {
    return { main: log.patientName ?? '(deleted patient)', patientId: log.patientId };
  }
  if (log.patientName) {
    return { main: log.patientName, sub: resLabel, patientId: log.patientId };
  }
  if (log.resourceName) {
    return { main: log.resourceName, sub: resLabel };
  }
  const shortId = log.resourceId ? `${log.resourceId.slice(0, 8)}…` : undefined;
  return { main: resLabel, sub: shortId };
}

export function AuditLogPage(): React.ReactElement {
  const { searchLogs } = useAuditLogs();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 25;

  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    searchLogs({
      page,
      limit,
      resource: resource || undefined,
      action: action || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
      .then((result) => {
        setLogs(result.data);
        setTotal(result.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [searchLogs, page, resource, action, startDate, endDate]);

  const totalPages = Math.ceil(total / limit);
  const COLS = 5;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">
            {total} record{total !== 1 ? 's' : ''} · click a row for full detail
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
      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label
            htmlFor="audit-filter-resource"
            className="text-xs font-medium text-slate-400 mb-1 block"
          >
            Resource
          </label>
          <select
            id="audit-filter-resource"
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
                {resourceLabels[r] ?? r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="audit-filter-action"
            className="text-xs font-medium text-slate-400 mb-1 block"
          >
            Action
          </label>
          <select
            id="audit-filter-action"
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
                {formatAction(a)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="audit-filter-start"
            className="text-xs font-medium text-slate-400 mb-1 block"
          >
            Start Date
          </label>
          <input
            id="audit-filter-start"
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
          <label
            htmlFor="audit-filter-end"
            className="text-xs font-medium text-slate-400 mb-1 block"
          >
            End Date
          </label>
          <input
            id="audit-filter-end"
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
      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 font-medium text-slate-400 w-8" aria-label="Expand" />
              <th className="px-4 py-3 font-medium text-slate-400">Timestamp</th>
              <th className="px-4 py-3 font-medium text-slate-400">User</th>
              <th className="px-4 py-3 font-medium text-slate-400">Action</th>
              <th className="px-4 py-3 font-medium text-slate-400">Subject</th>
            </tr>
          </thead>
          <tbody>
            {loading && !logs.length ? (
              <tr>
                <td colSpan={COLS} className="px-4 py-8 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={COLS} className="px-4 py-8 text-center text-slate-400">
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const target = describeTarget(log);
                const expanded = expandedId === log.id;
                return (
                  <Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedId(expanded ? null : log.id)}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-slate-400 align-top">
                        <span className="inline-block transition-transform" aria-hidden>
                          {expanded ? '▾' : '▸'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {log.user.firstName} {log.user.lastName}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatAction(log.action)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {target.patientId ? (
                          <Link
                            to={`/app/patients/${target.patientId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-accent hover:underline font-medium"
                          >
                            {target.main}
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-900">{target.main}</span>
                        )}
                        {target.sub && <span className="text-slate-400"> · {target.sub}</span>}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-slate-50 bg-slate-50">
                        <td />
                        <td colSpan={COLS - 1} className="px-4 py-4">
                          <dl className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-sm">
                            <dt className="text-slate-400">When</dt>
                            <dd className="text-slate-700">{formatFull(log.createdAt)}</dd>

                            <dt className="text-slate-400">Performed by</dt>
                            <dd className="text-slate-700">
                              {log.user.firstName} {log.user.lastName}{' '}
                              <span className="text-slate-400">({log.user.email})</span>
                            </dd>

                            <dt className="text-slate-400">Action</dt>
                            <dd className="text-slate-700">
                              {formatAction(log.action)}{' '}
                              <code className="text-xs text-slate-400">{log.action}</code>
                            </dd>

                            <dt className="text-slate-400">Resource</dt>
                            <dd className="text-slate-700">
                              {resourceLabels[log.resource] ?? log.resource}
                              {log.resourceId && (
                                <code className="ml-2 text-xs text-slate-400">
                                  {log.resourceId}
                                </code>
                              )}
                            </dd>

                            {log.patientName && (
                              <>
                                <dt className="text-slate-400">Patient</dt>
                                <dd className="text-slate-700">
                                  {target.patientId ? (
                                    <Link
                                      to={`/app/patients/${target.patientId}`}
                                      className="text-accent hover:underline"
                                    >
                                      {log.patientName}
                                    </Link>
                                  ) : (
                                    log.patientName
                                  )}
                                  {log.patientId && (
                                    <code className="ml-2 text-xs text-slate-400">
                                      {log.patientId}
                                    </code>
                                  )}
                                </dd>
                              </>
                            )}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
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
