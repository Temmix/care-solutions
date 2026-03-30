import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useVirtualWards, type VwEnrolment, type VwDashboard } from './hooks/use-virtual-wards';
import { ErrorAlert } from '../../components/ErrorAlert';

const statusColors: Record<string, string> = {
  ENROLLED: 'bg-blue-50 text-blue-700',
  MONITORING: 'bg-emerald-50 text-emerald-700',
  ESCALATED: 'bg-red-50 text-red-600',
  PAUSED: 'bg-amber-50 text-amber-700',
  DISCHARGED: 'bg-slate-100 text-slate-600',
};

const severityColors: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

export function VirtualWardsDashboardPage(): React.ReactElement {
  const { searchEnrolments, getDashboard, loading, error } = useVirtualWards();
  const [enrolments, setEnrolments] = useState<VwEnrolment[]>([]);
  const [dashboard, setDashboard] = useState<VwDashboard | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const limit = 20;

  useEffect(() => {
    getDashboard()
      .then(setDashboard)
      .catch(() => {});
    searchEnrolments({ page, limit, status: status || undefined })
      .then((result) => {
        setEnrolments(result.data);
        setTotal(result.total);
      })
      .catch(() => {});
  }, [page, status, searchEnrolments, getDashboard]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Virtual Wards</h1>
          <p className="text-sm text-slate-500 m-0">Hospital-at-home remote monitoring</p>
        </div>
        <Link
          to="/app/virtual-wards/enrol"
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 no-underline"
        >
          Enrol Patient
        </Link>
      </div>

      <ErrorAlert message={error} className="mb-4" />

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="text-xs text-slate-500 mb-1">Enrolled</div>
            <div className="text-2xl font-bold text-slate-900">{dashboard.enrolledCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="text-xs text-slate-500 mb-1">Open Alerts</div>
            <div className="text-2xl font-bold text-red-600">{dashboard.openAlertCount}</div>
          </div>
          {dashboard.alertsBySeverity.map((a) => (
            <div key={a.severity} className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="text-xs text-slate-500 mb-1">{a.severity} Alerts</div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[a.severity] ?? ''}`}
                >
                  {a.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="ENROLLED">Enrolled</option>
          <option value="MONITORING">Monitoring</option>
          <option value="ESCALATED">Escalated</option>
          <option value="PAUSED">Paused</option>
          <option value="DISCHARGED">Discharged</option>
        </select>
      </div>

      {/* Loading */}
      {loading && enrolments.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>
      )}

      {/* Table */}
      {enrolments.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-4 py-3 font-medium text-slate-500">Patient</th>
                <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 font-medium text-slate-500">Open Alerts</th>
                <th className="px-4 py-3 font-medium text-slate-500">Enrolled By</th>
              </tr>
            </thead>
            <tbody>
              {enrolments.map((e) => (
                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/app/virtual-wards/${e.id}`}
                      className="text-accent hover:underline font-medium"
                    >
                      {e.patient.givenName} {e.patient.familyName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[e.status] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {e._count?.alerts ? (
                      <span className="text-red-600 font-medium">{e._count.alerts}</span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {e.enroller.firstName} {e.enroller.lastName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && enrolments.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 text-center py-12">
          <p className="text-slate-500 text-sm mb-3">No virtual ward enrolments found</p>
          <Link to="/app/virtual-wards/enrol" className="text-accent text-sm hover:underline">
            Enrol a patient
          </Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
