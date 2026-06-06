import { useEffect, useState } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert';
import { useAdminShiftReports } from './hooks/use-admin-shift-reports';
import { ExpandableText } from './ExpandableText';
import { CATEGORY_LABELS, type ShiftReportPriority } from './types';

const LIMIT = 25;

const PRIORITY_BADGE: Record<ShiftReportPriority, { bg: string; text: string; label: string }> = {
  NORMAL: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Normal' },
  CONCERN: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Concern' },
  URGENT: { bg: 'bg-red-50', text: 'text-red-600', label: 'Urgent' },
};

export function ShiftReportsPage(): React.ReactElement {
  const { data, loading, error, fetchReports } = useAdminShiftReports();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [patientId, setPatientId] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    void fetchReports({
      from: from || undefined,
      to: to || undefined,
      patientId: patientId.trim() || undefined,
      page,
    });
  }, [from, to, patientId, page, fetchReports]);

  // Any filter change resets to the first page.
  const onFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Shift Reports</h1>
        <p className="text-slate-500 text-sm mt-1">
          Care notes, incidents and concerns logged by staff during their shifts
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => onFilterChange(setFrom)(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => onFilterChange(setTo)(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Patient ID (optional)
            </label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => onFilterChange(setPatientId)(e.target.value)}
              placeholder="Filter by patient ID"
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 w-48"
            />
          </div>
          {(from || to || patientId) && (
            <button
              onClick={() => {
                setFrom('');
                setTo('');
                setPatientId('');
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <ErrorAlert message={error} className="mb-6" />

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400 text-sm">Loading shift reports…</div>
        </div>
      )}

      {data && !loading && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {data.data.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No shift reports found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Time</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">
                      Patient
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">
                      Category
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">
                      Priority
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Note</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">
                      Location
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">
                      Recorded by
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((r) => {
                    const badge = PRIORITY_BADGE[r.priority];
                    return (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {new Date(r.recordedAt).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                          {r.patient ? `${r.patient.givenName} ${r.patient.familyName}` : '-'}
                          {r.bed && (
                            <span className="text-xs text-slate-400 font-normal">
                              {' '}
                              · Bed {r.bed.identifier}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {CATEGORY_LABELS[r.category] ?? r.category}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-md align-top">
                          <ExpandableText text={r.content} />
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {r.location?.name ?? '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {r.recordedBy
                            ? `${r.recordedBy.firstName} ${r.recordedBy.lastName}`
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Page {data.page} of {totalPages} ({data.total} reports)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                  className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-50 cursor-pointer hover:bg-slate-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={data.page >= totalPages}
                  className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-50 cursor-pointer hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
