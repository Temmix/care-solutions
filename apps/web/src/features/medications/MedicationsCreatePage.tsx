import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useMedications, type MedicationCatalogueItem } from './hooks/use-medications';
import { usePatients, type FhirPatient } from '../patients/hooks/use-patients';
import { ErrorAlert } from '../../components/ErrorAlert';

const ROUTES = [
  'ORAL',
  'TOPICAL',
  'INTRAVENOUS',
  'INTRAMUSCULAR',
  'SUBCUTANEOUS',
  'INHALED',
  'RECTAL',
  'SUBLINGUAL',
  'OTHER',
] as const;
const FREQUENCIES = ['OD', 'BD', 'TDS', 'QDS', 'PRN', 'NOCTE', 'MANE', 'STAT'] as const;
const PRIORITIES = ['routine', 'urgent', 'asap', 'stat'] as const;

interface FormData {
  medicationId: string;
  patientId: string;
  dosageText: string;
  dose: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate: string;
  priority: string;
  reasonText: string;
  instructions: string;
  asNeeded: boolean;
  asNeededReason: string;
  maxDosePerDay: string;
}

type FieldErrors = Record<string, string>;

function validate(form: FormData): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.medicationId) errors.medicationId = 'Medication is required';
  if (!form.patientId) errors.patientId = 'Patient is required';
  if (!form.dosageText.trim()) errors.dosageText = 'Dosage instructions are required';
  if (!form.startDate) errors.startDate = 'Start date is required';
  if (form.endDate && form.startDate && form.endDate < form.startDate)
    errors.endDate = 'End date must be after start date';
  return errors;
}

export function MedicationsCreatePage(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createPrescription, getCatalogue } = useMedications();
  const { searchPatients } = usePatients();
  const [patients, setPatients] = useState<FhirPatient[]>([]);
  const [medications, setMedications] = useState<MedicationCatalogueItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const presetPatientId = searchParams.get('patientId') ?? '';

  const [form, setForm] = useState<FormData>({
    medicationId: '',
    patientId: presetPatientId,
    dosageText: '',
    dose: '',
    frequency: '',
    route: 'ORAL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    priority: 'routine',
    reasonText: '',
    instructions: '',
    asNeeded: false,
    asNeededReason: '',
    maxDosePerDay: '',
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

  useEffect(() => {
    getCatalogue()
      .then(setMedications)
      .catch(() => {});
  }, [getCatalogue]);

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
        medicationId: form.medicationId,
        patientId: form.patientId,
        dosageText: form.dosageText.trim(),
        route: form.route,
        startDate: form.startDate,
        priority: form.priority,
      };
      if (form.dose.trim()) data.dose = form.dose.trim();
      if (form.frequency) data.frequency = form.frequency;
      if (form.endDate) data.endDate = form.endDate;
      if (form.reasonText.trim()) data.reasonText = form.reasonText.trim();
      if (form.instructions.trim()) data.instructions = form.instructions.trim();
      if (form.asNeeded) {
        data.asNeeded = true;
        if (form.asNeededReason.trim()) data.asNeededReason = form.asNeededReason.trim();
      }
      if (form.maxDosePerDay.trim()) data.maxDosePerDay = form.maxDosePerDay.trim();

      const result = await createPrescription(data);
      navigate(`/app/medications/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create prescription');
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
          to="/app/medications"
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
          Back to Medications
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Prescription</h1>
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

        {/* Medication */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Medication *</label>
          <select
            value={form.medicationId}
            onChange={set('medicationId')}
            onBlur={blur('medicationId')}
            className={inputCls('medicationId')}
          >
            <option value="">Select a medication</option>
            {medications.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.strength ? ` ${m.strength}` : ''} ({m.form.toLowerCase()})
              </option>
            ))}
          </select>
          {showError('medicationId') && (
            <p className="mt-1 text-xs text-red-600 m-0">{showError('medicationId')}</p>
          )}
        </div>

        {/* Dosage */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">
            Dosage Instructions *
          </label>
          <input
            type="text"
            value={form.dosageText}
            onChange={set('dosageText')}
            onBlur={blur('dosageText')}
            placeholder="e.g. 1 tablet twice daily with food"
            className={inputCls('dosageText')}
          />
          {showError('dosageText') && (
            <p className="mt-1 text-xs text-red-600 m-0">{showError('dosageText')}</p>
          )}
        </div>

        {/* Dose + Frequency + Route */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Dose</label>
            <input
              type="text"
              value={form.dose}
              onChange={set('dose')}
              placeholder="e.g. 500mg"
              className={inputCls('dose')}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Frequency</label>
            <select
              value={form.frequency}
              onChange={set('frequency')}
              className={inputCls('frequency')}
            >
              <option value="">Select</option>
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Route</label>
            <select value={form.route} onChange={set('route')} className={inputCls('route')}>
              {ROUTES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dates + Priority */}
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
            <label className="text-xs font-medium text-slate-400 mb-1 block">Priority</label>
            <select
              value={form.priority}
              onChange={set('priority')}
              className={inputCls('priority')}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Reason</label>
          <input
            type="text"
            value={form.reasonText}
            onChange={set('reasonText')}
            placeholder="e.g. Hypertension management"
            className={inputCls('reasonText')}
          />
        </div>

        {/* As Needed */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.asNeeded}
              onChange={(e) => setForm((prev) => ({ ...prev, asNeeded: e.target.checked }))}
              className="rounded"
            />
            As needed (PRN)
          </label>
          {form.asNeeded && (
            <input
              type="text"
              value={form.asNeededReason}
              onChange={set('asNeededReason')}
              placeholder="Reason (e.g. for pain)"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none"
            />
          )}
        </div>

        {/* Max dose + Instructions */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">
              Max Dose Per Day
            </label>
            <input
              type="text"
              value={form.maxDosePerDay}
              onChange={set('maxDosePerDay')}
              placeholder="e.g. 4g"
              className={inputCls('maxDosePerDay')}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">
              Special Instructions
            </label>
            <input
              type="text"
              value={form.instructions}
              onChange={set('instructions')}
              placeholder="e.g. Take with food"
              className={inputCls('instructions')}
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
            {saving ? 'Creating...' : 'Create Prescription'}
          </button>
          <Link
            to="/app/medications"
            className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium no-underline hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
