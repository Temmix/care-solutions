import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAssessments } from './hooks/use-assessments';
import { useAssessmentTypes } from './hooks/use-assessment-types';
import { api } from '../../lib/api-client';

interface FhirPatientEntry {
  id: string;
  name?: { given?: string[]; family?: string }[];
}

interface PatientOption {
  id: string;
  givenName: string;
  familyName: string;
}

const RISK_LEVELS = [
  { value: '', label: 'Not assessed' },
  { value: 'NONE', label: 'No Risk' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'VERY_HIGH', label: 'Very High' },
];

export function AssessmentCreatePage(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createAssessment } = useAssessments();
  const { types: assessmentTypes } = useAssessmentTypes();

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientId, setPatientId] = useState(searchParams.get('patientId') ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assessmentType, setAssessmentType] = useState('GENERAL');
  const [toolName, setToolName] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [scoreInterpretation, setScoreInterpretation] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [notes, setNotes] = useState('');
  const [recommendedActions, setRecommendedActions] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ entry?: { resource?: FhirPatientEntry }[] }>('/patients?limit=200')
      .then((result) => {
        const list = (result.entry ?? [])
          .map((e) => e.resource)
          .filter((r): r is FhirPatientEntry => !!r);
        setPatients(
          list.map((p) => ({
            id: p.id,
            givenName: p.name?.[0]?.given?.[0] ?? '',
            familyName: p.name?.[0]?.family ?? '',
          })),
        );
      })
      .catch(() => {});
  }, []);

  const isValid = patientId && title.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSaving(true);
    setError('');
    try {
      const data: Record<string, unknown> = {
        patientId,
        title: title.trim(),
        assessmentType,
      };
      if (description.trim()) data.description = description.trim();
      if (toolName.trim()) data.toolName = toolName.trim();
      if (score) data.score = parseInt(score, 10);
      if (maxScore) data.maxScore = parseInt(maxScore, 10);
      if (scoreInterpretation.trim()) data.scoreInterpretation = scoreInterpretation.trim();
      if (riskLevel) data.riskLevel = riskLevel;
      if (notes.trim()) data.notes = notes.trim();
      if (recommendedActions.trim()) {
        data.recommendedActions = JSON.stringify(
          recommendedActions
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean),
        );
      }

      const created = await createAssessment(data);
      navigate(`/assessments/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/assessments"
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
        <h1 className="text-2xl font-bold text-slate-900">New Assessment</h1>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Assessment Details</h2>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Patient *</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white appearance-none"
            >
              <option value="">Select patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.givenName} {p.familyName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Falls Risk Assessment"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white appearance-none"
              >
                {assessmentTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y box-border"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Assessment Tool Name
            </label>
            <input
              type="text"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              placeholder="e.g. Tinetti Scale, Waterlow Scale, MUST"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Scoring</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Score</label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Score</label>
              <input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Risk Level</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white appearance-none"
              >
                {RISK_LEVELS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Score Interpretation
            </label>
            <input
              type="text"
              value={scoreInterpretation}
              onChange={(e) => setScoreInterpretation(e.target.value)}
              placeholder="e.g. Moderate fall risk"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Notes & Actions</h2>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Clinical Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y box-border"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Recommended Actions (one per line)
            </label>
            <textarea
              value={recommendedActions}
              onChange={(e) => setRecommendedActions(e.target.value)}
              rows={4}
              placeholder="Enter each action on a new line..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y box-border"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!isValid || saving}
            className="px-6 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {saving ? 'Creating...' : 'Create Assessment'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/assessments')}
            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
