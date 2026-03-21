import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useVirtualWards } from './hooks/use-virtual-wards';
import { usePatients, type FhirPatient } from '../patients/hooks/use-patients';
import { api } from '../../lib/api-client';
import { ErrorAlert } from '../../components/ErrorAlert';

interface EncounterOption {
  id: string;
  status: string;
  class: string;
  admissionDate: string;
}

interface FormData {
  patientId: string;
  encounterId: string;
  clinicalSummary: string;
}

function validate(f: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!f.patientId) errors.patientId = 'Patient is required';
  if (!f.encounterId) errors.encounterId = 'Encounter is required';
  return errors;
}

export function VirtualWardsEnrolPage(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enrolPatient } = useVirtualWards();
  const { searchPatients } = usePatients();

  const [form, setForm] = useState<FormData>({
    patientId: searchParams.get('patientId') ?? '',
    encounterId: searchParams.get('encounterId') ?? '',
    clinicalSummary: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<FhirPatient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);

  // Encounters for selected patient
  const [encounters, setEncounters] = useState<EncounterOption[]>([]);
  const [encountersLoading, setEncountersLoading] = useState(false);

  // Load patients on search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (patientSearch.length < 2) {
        setPatients([]);
        return;
      }
      setPatientsLoading(true);
      searchPatients({ name: patientSearch, limit: 20 })
        .then((result) => {
          setPatients(
            (result.entry ?? []).map((e) => e.resource).filter((r): r is FhirPatient => !!r),
          );
        })
        .catch(() => {})
        .finally(() => setPatientsLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [patientSearch, searchPatients]);

  // Load encounters when patient changes
  useEffect(() => {
    if (!form.patientId) {
      setEncounters([]);
      return;
    }
    setEncountersLoading(true);
    const q = new URLSearchParams();
    q.set('patientId', form.patientId);
    q.set('limit', '50');
    api
      .get<{ data: EncounterOption[] }>(`/encounters?${q.toString()}`)
      .then((result) => setEncounters(result.data))
      .catch(() => setEncounters([]))
      .finally(() => setEncountersLoading(false));
  }, [form.patientId]);

  const fieldErrors = useMemo(() => validate(form), [form]);
  const isValid = Object.keys(fieldErrors).length === 0;

  const selectedPatient = patients.find((p) => p.id === form.patientId);
  const [selectedPatientLabel, setSelectedPatientLabel] = useState('');

  useEffect(() => {
    if (selectedPatient) {
      const given = selectedPatient.name?.[0]?.given?.join(' ') ?? '';
      const family = selectedPatient.name?.[0]?.family ?? '';
      setSelectedPatientLabel(`${given} ${family}`.trim());
    }
  }, [selectedPatient]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function blur(field: string): void {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function selectCls(field: string): string {
    const base = 'w-full px-3 py-2 border rounded-lg text-sm bg-white';
    if (touched[field] && fieldErrors[field]) return `${base} border-red-300`;
    return `${base} border-slate-200`;
  }

  function inputCls(field: string): string {
    const base = 'w-full px-3 py-2 border rounded-lg text-sm';
    if (touched[field] && fieldErrors[field]) return `${base} border-red-300`;
    return `${base} border-slate-200`;
  }

  function selectPatient(patient: FhirPatient): void {
    set('patientId', patient.id);
    set('encounterId', '');
    const given = patient.name?.[0]?.given?.join(' ') ?? '';
    const family = patient.name?.[0]?.family ?? '';
    setSelectedPatientLabel(`${given} ${family}`.trim());
    setPatientSearch('');
    setPatients([]);
  }

  function clearPatient(): void {
    set('patientId', '');
    set('encounterId', '');
    setSelectedPatientLabel('');
  }

  function formatEncounterLabel(enc: EncounterOption): string {
    const date = new Date(enc.admissionDate).toLocaleDateString();
    const cls = enc.class.replace(/_/g, ' ');
    return `${cls} — ${date} (${enc.status})`;
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!isValid) {
      const allTouched: Record<string, boolean> = {};
      for (const key of Object.keys(fieldErrors)) allTouched[key] = true;
      setTouched((prev) => ({ ...prev, ...allTouched }));
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      await enrolPatient({
        patientId: form.patientId,
        encounterId: form.encounterId,
        clinicalSummary: form.clinicalSummary || undefined,
      });
      navigate('/app/virtual-wards');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to enrol patient');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link
        to="/app/virtual-wards"
        className="text-sm text-slate-500 hover:text-accent mb-4 inline-block"
      >
        &larr; Back to Virtual Wards
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Enrol Patient</h1>

      <ErrorAlert message={saveError} className="mb-4" />

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-100 p-6 max-w-2xl space-y-5"
      >
        {/* Patient */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Patient</label>
          {form.patientId ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50">
                {selectedPatientLabel || form.patientId}
              </div>
              <button
                type="button"
                onClick={clearPatient}
                className="px-3 py-2 text-xs text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg cursor-pointer"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                onBlur={() => blur('patientId')}
                className={inputCls('patientId')}
                placeholder="Search by patient name..."
              />
              {patientsLoading && (
                <div className="absolute right-3 top-2.5 text-xs text-slate-400">Searching...</div>
              )}
              {patients.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                  {patients.map((p) => {
                    const given = p.name?.[0]?.given?.join(' ') ?? '';
                    const family = p.name?.[0]?.family ?? '';
                    const dob = p.birthDate
                      ? ` — DOB: ${new Date(p.birthDate).toLocaleDateString()}`
                      : '';
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => selectPatient(p)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
                        >
                          <span className="font-medium">
                            {given} {family}
                          </span>
                          <span className="text-slate-400">{dob}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {patientSearch.length >= 2 && !patientsLoading && patients.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm text-slate-400">
                  No patients found
                </div>
              )}
            </div>
          )}
          {touched.patientId && fieldErrors.patientId && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.patientId}</p>
          )}
        </div>

        {/* Encounter */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Encounter</label>
          <select
            value={form.encounterId}
            onChange={(e) => set('encounterId', e.target.value)}
            onBlur={() => blur('encounterId')}
            className={selectCls('encounterId')}
            disabled={!form.patientId || encountersLoading}
          >
            <option value="">
              {!form.patientId
                ? 'Select a patient first'
                : encountersLoading
                  ? 'Loading encounters...'
                  : encounters.length === 0
                    ? 'No encounters found'
                    : 'Select an encounter'}
            </option>
            {encounters.map((enc) => (
              <option key={enc.id} value={enc.id}>
                {formatEncounterLabel(enc)}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            The active encounter for this patient&apos;s virtual ward stay
          </p>
          {touched.encounterId && fieldErrors.encounterId && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.encounterId}</p>
          )}
        </div>

        {/* Clinical Summary */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Clinical Summary <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            value={form.clinicalSummary}
            onChange={(e) => set('clinicalSummary', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            rows={3}
            placeholder="Brief clinical summary"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Enrolling...' : 'Enrol Patient'}
          </button>
          <Link
            to="/app/virtual-wards"
            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 no-underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
