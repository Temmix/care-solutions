import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useCarePlans } from './hooks/use-care-plans';
import { usePatients, type FhirPatient } from '../patients/hooks/use-patients';
import { ErrorAlert } from '../../components/ErrorAlert';

const CATEGORIES = ['GENERAL', 'NURSING', 'PHYSIOTHERAPY', 'MENTAL_HEALTH', 'PALLIATIVE'] as const;

interface FormData {
  title: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  nextReviewDate: string;
  patientId: string;
}

type FieldErrors = Record<string, string>;

function validate(form: FormData): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.title.trim()) errors.title = 'Title is required';
  if (!form.startDate) errors.startDate = 'Start date is required';
  if (!form.patientId) errors.patientId = 'Patient is required';
  if (form.endDate && form.startDate && form.endDate < form.startDate)
    errors.endDate = 'End date must be after start date';
  return errors;
}

export function CarePlanCreatePage(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createCarePlan } = useCarePlans();
  const { searchPatients } = usePatients();
  const [patients, setPatients] = useState<FhirPatient[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const presetPatientId = searchParams.get('patientId') ?? '';

  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    category: 'GENERAL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    nextReviewDate: '',
    patientId: presetPatientId,
  });

  const fieldErrors = useMemo(() => validate(form), [form]);
  const isValid = Object.keys(fieldErrors).length === 0;

  const showError = (field: string): string | undefined =>
    touched[field] ? fieldErrors[field] : undefined;

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const blur = (field: string) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  useEffect(() => {
    searchPatients({ limit: 200 })
      .then((result) => {
        const list = (result.entry ?? [])
          .map((e) => e.resource)
          .filter((r): r is FhirPatient => !!r);
        setPatients(list);
      })
      .catch(() => {});
  }, [searchPatients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched: Record<string, boolean> = {};
    for (const key of Object.keys(form)) allTouched[key] = true;
    setTouched(allTouched);
    if (!isValid) return;

    setSaving(true);
    setError('');
    try {
      const data: Record<string, unknown> = {
        title: form.title.trim(),
        category: form.category,
        startDate: form.startDate,
        patientId: form.patientId,
      };
      if (form.description.trim()) data.description = form.description.trim();
      if (form.endDate) data.endDate = form.endDate;
      if (form.nextReviewDate) data.nextReviewDate = form.nextReviewDate;

      const result = await createCarePlan(data);
      navigate(`/care-plans/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create care plan');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (field: string) =>
    `w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors ${
      showError(field)
        ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
        : 'border-slate-200'
    }`;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          to="/app/care-plans"
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
          Back to Care Plans
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Care Plan</h1>
      </div>

      <ErrorAlert message={error} className="mb-6" />

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-100 p-6 space-y-5"
      >
        {/* Patient */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Patient *</label>
          <select
            value={form.patientId}
            onChange={set('patientId')}
            onBlur={blur('patientId')}
            className={inputCls('patientId')}
          >
            <option value="">Select a patient</option>
            {patients.map((p) => {
              const name = p.name?.[0];
              return (
                <option key={p.id} value={p.id}>
                  {name?.given?.join(' ')} {name?.family}
                </option>
              );
            })}
          </select>
          {showError('patientId') && (
            <p className="mt-1 text-xs text-red-600 m-0">{showError('patientId')}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={set('title')}
            onBlur={blur('title')}
            placeholder="e.g. Falls Prevention Plan"
            className={inputCls('title')}
          />
          {showError('title') && (
            <p className="mt-1 text-xs text-red-600 m-0">{showError('title')}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Description</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            placeholder="Brief description of the care plan..."
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none resize-y box-border focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors placeholder:text-slate-400"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Category</label>
          <select value={form.category} onChange={set('category')} className={inputCls('category')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Start Date *</label>
            <input
              type="date"
              value={form.startDate}
              onChange={set('startDate')}
              onBlur={blur('startDate')}
              className={inputCls('startDate')}
            />
            {showError('startDate') && (
              <p className="mt-1 text-xs text-red-600 m-0">{showError('startDate')}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={set('endDate')}
              onBlur={blur('endDate')}
              className={inputCls('endDate')}
            />
            {showError('endDate') && (
              <p className="mt-1 text-xs text-red-600 m-0">{showError('endDate')}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Next Review</label>
            <input
              type="date"
              value={form.nextReviewDate}
              onChange={set('nextReviewDate')}
              className={inputCls('nextReviewDate')}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create Care Plan'}
          </button>
          <Link
            to="/app/care-plans"
            className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium no-underline hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
