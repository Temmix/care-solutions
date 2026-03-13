import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCarePlans, type FhirCarePlan } from './hooks/use-care-plans';
import { CarePlanStatusBadge } from './components/CarePlanStatusBadge';

const STATUSES = ['', 'DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
const CATEGORIES = [
  '',
  'GENERAL',
  'NURSING',
  'PHYSIOTHERAPY',
  'MENTAL_HEALTH',
  'PALLIATIVE',
] as const;

export function CarePlanListPage(): React.ReactElement {
  const { searchCarePlans, loading, error } = useCarePlans();
  const [carePlans, setCarePlans] = useState<FhirCarePlan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const limit = 20;

  useEffect(() => {
    const params: Record<string, unknown> = { page, limit };
    if (status) params.status = status;
    if (category) params.category = category;

    searchCarePlans(params as any)
      .then((result) => {
        setCarePlans(
          (result.entry ?? []).map((e) => e.resource).filter((r): r is FhirCarePlan => !!r),
        );
        setTotal(result.total ?? 0);
      })
      .catch(() => {});
  }, [page, status, category, searchCarePlans]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Care Plans</h1>
          <p className="text-sm text-slate-500 m-0">
            {total} care plan{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/care-plans/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white no-underline rounded-lg text-sm font-medium transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Care Plan
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white appearance-none"
        >
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white appearance-none"
        >
          <option value="">All Categories</option>
          {CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>
              {c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && carePlans.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-400 text-sm">Loading care plans...</div>
        </div>
      )}

      {!loading && carePlans.length === 0 && (
        <div className="text-center py-20">
          <p className="text-slate-400 text-sm mb-4 m-0">No care plans found</p>
          <Link to="/care-plans/new" className="text-accent text-sm no-underline hover:underline">
            Create your first care plan
          </Link>
        </div>
      )}

      {carePlans.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left font-medium text-slate-500 px-6 py-3">Title</th>
                <th className="text-left font-medium text-slate-500 px-6 py-3">Patient</th>
                <th className="text-left font-medium text-slate-500 px-6 py-3">Category</th>
                <th className="text-left font-medium text-slate-500 px-6 py-3">Status</th>
                <th className="text-left font-medium text-slate-500 px-6 py-3">Start Date</th>
                <th className="text-left font-medium text-slate-500 px-6 py-3">Author</th>
              </tr>
            </thead>
            <tbody>
              {carePlans.map((cp) => (
                <tr
                  key={cp.id}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      to={`/care-plans/${cp.id}`}
                      className="text-slate-900 font-medium no-underline hover:text-accent transition-colors"
                    >
                      {cp.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{cp.subject?.display ?? '-'}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {(cp.category?.[0]?.text ?? '-').charAt(0) +
                      (cp.category?.[0]?.text ?? '-').slice(1).toLowerCase().replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4">
                    <CarePlanStatusBadge status={cp.status} />
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {cp.period?.start ? new Date(cp.period.start).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{cp.author?.display ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
