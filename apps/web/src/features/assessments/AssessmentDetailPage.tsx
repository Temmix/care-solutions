import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAssessments, type FhirAssessment } from './hooks/use-assessments';
import { AssessmentStatusBadge } from './components/AssessmentStatusBadge';
import { RiskLevelBadge } from './components/RiskLevelBadge';
import { useAuth } from '../../hooks/use-auth';
import { ErrorAlert } from '../../components/ErrorAlert';

export function AssessmentDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { getAssessment, reviewAssessment } = useAssessments();
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<FhirAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!id) return;
    getAssessment(id)
      .then(setAssessment)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id, getAssessment]);

  const handleReview = async () => {
    if (!id) return;
    setReviewing(true);
    try {
      const updated = await reviewAssessment(id);
      setAssessment(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review');
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400 text-sm">Loading assessment...</div>
      </div>
    );
  }

  if (error && !assessment) {
    return <ErrorAlert message={error} className="mb-4" />;
  }

  if (!assessment) {
    return <div className="text-slate-500 text-center py-20">Assessment not found</div>;
  }

  const riskLevel = assessment.interpretation?.[0]?.coding?.[0]?.code;
  const isReviewed = !!assessment.reviewedBy;
  const canReview =
    !isReviewed &&
    assessment.status === 'final' &&
    (user?.role === 'ADMIN' || user?.role === 'CLINICIAN');

  return (
    <div>
      {/* Breadcrumb + header */}
      <div className="mb-6">
        <Link
          to="/app/assessments"
          className="inline-flex items-center gap-1 text-slate-400 no-underline text-sm hover:text-slate-600 transition-colors mb-3"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to Assessments
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">{assessment.title}</h1>
            <div className="flex items-center gap-3 text-sm">
              <AssessmentStatusBadge status={assessment.status} isReviewed={isReviewed} />
              {riskLevel && <RiskLevelBadge riskLevel={riskLevel} />}
              {assessment.toolName && <span className="text-slate-500">{assessment.toolName}</span>}
            </div>
          </div>
          {canReview && (
            <button
              onClick={handleReview}
              disabled={reviewing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {reviewing ? 'Reviewing...' : 'Mark as Reviewed'}
            </button>
          )}
        </div>
      </div>

      <ErrorAlert message={error} className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-slate-400 mb-0.5">Patient</div>
                <div className="text-sm text-slate-900">{assessment.subject.display}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400 mb-0.5">Type</div>
                <div className="text-sm text-slate-900">{assessment.code.text}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400 mb-0.5">Performed By</div>
                <div className="text-sm text-slate-900">
                  {assessment.performer?.[0]?.display ?? '—'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400 mb-0.5">Date</div>
                <div className="text-sm text-slate-900">
                  {assessment.effectiveDateTime
                    ? new Date(assessment.effectiveDateTime).toLocaleString()
                    : '—'}
                </div>
              </div>
              {isReviewed && (
                <>
                  <div>
                    <div className="text-xs font-medium text-slate-400 mb-0.5">Reviewed By</div>
                    <div className="text-sm text-slate-900">
                      {assessment.reviewedBy?.display ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-400 mb-0.5">Reviewed At</div>
                    <div className="text-sm text-slate-900">
                      {assessment.reviewedAt
                        ? new Date(assessment.reviewedAt).toLocaleString()
                        : '—'}
                    </div>
                  </div>
                </>
              )}
            </div>
            {assessment.description && (
              <div className="mt-4">
                <div className="text-xs font-medium text-slate-400 mb-1">Description</div>
                <p className="text-sm text-slate-700 m-0">{assessment.description}</p>
              </div>
            )}
          </div>

          {/* Clinical Notes */}
          {assessment.note?.[0]?.text && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Clinical Notes</h2>
              <p className="text-sm text-slate-700 m-0 whitespace-pre-wrap">
                {assessment.note[0].text}
              </p>
            </div>
          )}

          {/* Recommended Actions */}
          {assessment.recommendedActions && assessment.recommendedActions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Recommended Actions</h2>
              <ul className="space-y-2 m-0 pl-0 list-none">
                {assessment.recommendedActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <svg
                      className="w-4 h-4 text-accent mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      />
                    </svg>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar — Score */}
        <div className="space-y-6">
          {assessment.valueQuantity?.value != null && (
            <div className="bg-white rounded-xl border border-slate-100 p-6 text-center">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Score</h2>
              <div className="text-4xl font-bold text-slate-900">
                {assessment.valueQuantity.value}
              </div>
              {assessment.maxScore && (
                <div className="text-lg text-slate-400 mt-1">/ {assessment.maxScore}</div>
              )}
              {riskLevel && (
                <div className="mt-4">
                  <RiskLevelBadge riskLevel={riskLevel} />
                </div>
              )}
              {assessment.scoreInterpretation && (
                <p className="text-xs text-slate-500 mt-3 m-0">{assessment.scoreInterpretation}</p>
              )}
            </div>
          )}

          {/* Meta info */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Assessment Info</h2>
            <div className="space-y-3">
              {assessment.toolName && (
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-0.5">Tool</div>
                  <div className="text-sm text-slate-900">{assessment.toolName}</div>
                </div>
              )}
              <div>
                <div className="text-xs font-medium text-slate-400 mb-0.5">Type</div>
                <div className="text-sm text-slate-900">{assessment.code.text}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400 mb-0.5">Last Updated</div>
                <div className="text-sm text-slate-900">
                  {assessment.meta?.lastUpdated
                    ? new Date(assessment.meta.lastUpdated).toLocaleString()
                    : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
