import { useState, useEffect } from 'react';
import { useTimesheets } from './hooks/use-timesheets';
import { ErrorAlert } from '../../components/ErrorAlert';

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  CLOCKED_IN: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Clocked In' },
  CLOCKED_OUT: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Clocked Out' },
  MISSED: { bg: 'bg-red-50', text: 'text-red-600', label: 'Missed' },
  AUTO_CLOCKED_OUT: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Auto Clocked Out' },
};

function formatDuration(minutes: number | null): string {
  if (minutes == null) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getWeekRange(): { from: string; to: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    from: monday.toISOString().split('T')[0],
    to: sunday.toISOString().split('T')[0],
  };
}

export function TimesheetPage(): React.ReactElement {
  const { data, loading, error, fetchTimesheets } = useTimesheets();
  const [dateRange, setDateRange] = useState(getWeekRange);
  const [staffFilter, setStaffFilter] = useState('');

  useEffect(() => {
    fetchTimesheets({
      from: dateRange.from,
      to: dateRange.to,
      userId: staffFilter || undefined,
    });
  }, [dateRange, staffFilter, fetchTimesheets]);

  const handlePageChange = (page: number) => {
    fetchTimesheets({
      from: dateRange.from,
      to: dateRange.to,
      userId: staffFilter || undefined,
      page,
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Timesheets</h1>
        <p className="text-slate-500 text-sm mt-1">
          View staff clock-in/out records and attendance
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Staff ID (optional)
            </label>
            <input
              type="text"
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              placeholder="Filter by user ID"
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 w-48"
            />
          </div>
        </div>
      </div>

      <ErrorAlert message={error} className="mb-6" />

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400 text-sm">Loading timesheets...</div>
        </div>
      )}

      {/* Table */}
      {data && !loading && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {data.items.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No timesheet records found for the selected period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">
                      Staff
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">
                      Shift Date
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">
                      Shift Time
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">
                      Location
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">
                      Clock In
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">
                      Clock Out
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">
                      Duration
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">
                      Flags
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((record) => {
                    const badge = STATUS_BADGE[record.status];
                    const pattern = record.shiftAssignment.shift.shiftPattern;
                    return (
                      <tr key={record.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {record.user.firstName} {record.user.lastName}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(record.shiftAssignment.shift.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {pattern.startTime} — {pattern.endTime}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {record.shiftAssignment.shift.location?.name ?? '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(record.clockInAt).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {record.clockOutAt
                            ? new Date(record.clockOutAt).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {formatDuration(record.durationMinutes)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge?.bg ?? 'bg-slate-100'} ${badge?.text ?? 'text-slate-600'}`}
                          >
                            {badge?.label ?? record.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            {record.flags.late && (
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">
                                Late {record.flags.lateMinutes}m
                              </span>
                            )}
                            {record.flags.autoClockOut && (
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700">
                                Auto
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Page {data.page} of {data.totalPages} ({data.total} records)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(data.page - 1)}
                  disabled={data.page <= 1}
                  className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-50 cursor-pointer hover:bg-slate-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(data.page + 1)}
                  disabled={data.page >= data.totalPages}
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
