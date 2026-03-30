import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useChc, type ChcCase } from './hooks/use-chc';
import { ErrorAlert } from '../../components/ErrorAlert';

const STATUSES = [
  '',
  'REFERRAL',
  'SCREENING',
  'ASSESSMENT',
  'DECISION',
  'APPROVED',
  'REJECTED',
  'CARE_PACKAGE_LIVE',
  'ANNUAL_REVIEW',
  'CLOSED',
] as const;

const statusColors: Record<string, string> = {
  REFERRAL: 'bg-blue-50 text-blue-700',
  SCREENING: 'bg-amber-50 text-amber-700',
  ASSESSMENT: 'bg-purple-50 text-purple-700',
  DECISION: 'bg-orange-50 text-orange-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-600',
  CARE_PACKAGE_LIVE: 'bg-green-50 text-green-700',
  ANNUAL_REVIEW: 'bg-indigo-50 text-indigo-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ChcListPage(): React.ReactElement {
  const { searchCases, loading, error } = useChc();
  const [cases, setCases] = useState<ChcCase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const limit = 20;

  useEffect(() => {
    searchCases({ page, limit, status: status || undefined })
      .then((result) => {
        setCases(result.data);
        setTotal(result.total);
      })
      .catch(() => {});
  }, [page, status, searchCases]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Continuing Healthcare (CHC)</h1>
          <p className="text-sm text-slate-500 m-0">
            {total} case{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/app/chc/new"
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 no-underline"
        >
          New Referral
        </Link>
      </div>

      <ErrorAlert message={error} className="mb-4" />

      {/* Filters */}
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
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && cases.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>
      )}

      {/* Table */}
      {cases.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-4 py-3 font-medium text-slate-500">Patient</th>
                <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 font-medium text-slate-500">Referral Date</th>
                <th className="px-4 py-3 font-medium text-slate-500">Fast Track</th>
                <th className="px-4 py-3 font-medium text-slate-500">Referrer</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/app/chc/${c.id}`}
                      className="text-accent hover:underline font-medium"
                    >
                      {c.patient.givenName} {c.patient.familyName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(c.referralDate)}</td>
                  <td className="px-4 py-3">
                    {c.isFastTrack ? (
                      <span className="text-red-600 font-medium text-xs">FAST TRACK</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.referrer.firstName} {c.referrer.lastName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && cases.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 text-center py-12">
          <p className="text-slate-500 text-sm mb-3">No CHC cases found</p>
          <Link to="/app/chc/new" className="text-accent text-sm hover:underline">
            Create a new referral
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
