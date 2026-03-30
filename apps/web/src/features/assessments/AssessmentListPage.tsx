import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAssessments, type FhirAssessment } from './hooks/use-assessments';
import { useAssessmentTypes } from './hooks/use-assessment-types';
import { AssessmentStatusBadge } from './components/AssessmentStatusBadge';
import { RiskLevelBadge } from './components/RiskLevelBadge';

const RISK_LEVELS = [
  { value: '', label: 'All Risk Levels' },
  { value: 'NONE', label: 'No Risk' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'VERY_HIGH', label: 'Very High' },
];

export function AssessmentListPage(): React.ReactElement {
  const { searchAssessments, loading } = useAssessments();
  const { types: assessmentTypes } = useAssessmentTypes();
  const typeOptions = useMemo(
    () => [
      { value: '', label: 'All Types' },
      ...assessmentTypes.map((t) => ({ value: t.code, label: t.name })),
    ],
    [assessmentTypes],
  );
  const [assessments, setAssessments] = useState<FhirAssessment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const limit = 20;

  useEffect(() => {
    searchAssessments({
      assessmentType: typeFilter || undefined,
      riskLevel: riskFilter || undefined,
      page,
      limit,
    })
      .then((result) => {
        setAssessments(
          (result.entry ?? []).map((e) => e.resource).filter((r): r is FhirAssessment => !!r),
        );
        setTotal(result.total ?? 0);
      })
      .catch(() => {});
  }, [searchAssessments, page, typeFilter, riskFilter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assessments</h1>
          <p className="text-sm text-slate-500 mt-1">
            {total} assessment{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/app/assessments/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white no-underline rounded-lg text-sm font-medium transition-colors"
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
          New Assessment
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white appearance-none"
        >
          {typeOptions.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={riskFilter}
          onChange={(e) => {
            setRiskFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white appearance-none"
        >
          {RISK_LEVELS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        {loading && assessments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>
        ) : assessments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No assessments found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Title</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Patient</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Score</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Risk</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {assessments.map((a) => {
                const riskLevel = a.interpretation?.[0]?.coding?.[0]?.code;
                const isReviewed = !!a.reviewedBy;
                return (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link
                        to={`/app/assessments/${a.id}`}
                        className="text-sm font-medium text-accent no-underline hover:underline"
                      >
                        {a.title}
                      </Link>
                      {a.toolName && (
                        <div className="text-xs text-slate-400 mt-0.5">{a.toolName}</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-700">{a.subject.display}</td>
                    <td className="px-6 py-3">
                      <span className="text-xs text-slate-600">
                        {a.code.text?.replace(/ Assessment$/, '') ?? ''}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-mono text-slate-700">
                      {a.valueQuantity?.value != null
                        ? `${a.valueQuantity.value}${a.valueQuantity.unit ?? ''}`
                        : '—'}
                    </td>
                    <td className="px-6 py-3">
                      {riskLevel ? <RiskLevelBadge riskLevel={riskLevel} /> : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <AssessmentStatusBadge status={a.status} isReviewed={isReviewed} />
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">
                      {a.effectiveDateTime
                        ? new Date(a.effectiveDateTime).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
