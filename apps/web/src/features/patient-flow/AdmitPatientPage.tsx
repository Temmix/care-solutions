import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePatientFlow, type Location, type Bed } from './hooks/use-patient-flow';
import { useAuth } from '../../hooks/use-auth';
import { api } from '../../lib/api-client';
import { ErrorAlert } from '../../components/ErrorAlert';

interface PatientOption {
  id: string;
  givenName: string;
  familyName: string;
}

const encounterClasses = ['INPATIENT', 'OUTPATIENT', 'EMERGENCY', 'HOME_HEALTH'];
const admissionSources = ['GP_REFERRAL', 'EMERGENCY', 'TRANSFER', 'SELF_REFERRAL', 'OTHER'];

export function AdmitPatientPage(): React.ReactElement {
  const navigate = useNavigate();
  const { isSuperAdmin, selectedTenant } = useAuth();
  const { admitPatient, listLocations, listBeds, loading, error } = usePatientFlow();
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [patientId, setPatientId] = useState('');
  const [encounterClass, setEncounterClass] = useState('INPATIENT');
  const [admissionSource, setAdmissionSource] = useState('');
  const [locationId, setLocationId] = useState('');
  const [bedId, setBedId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isSuperAdmin && !selectedTenant) return;
    const loadData = async () => {
      try {
        const [locData, patientResult] = await Promise.all([
          listLocations(),
          api.get<{ data: PatientOption[] }>('/patients?limit=200'),
        ]);
        setLocations(locData);
        const pts = (patientResult as Record<string, unknown>).entry
          ? (
              (patientResult as Record<string, unknown>).entry as Array<{
                resource: Record<string, unknown>;
              }>
            ).map((e) => {
              const r = e.resource;
              const name = (r.name as Array<{ given?: string[]; family?: string }>)?.[0];
              return {
                id: r.id as string,
                givenName: name?.given?.[0] ?? '',
                familyName: name?.family ?? '',
              };
            })
          : [];
        setPatients(pts);
      } catch {
        // error
      }
    };
    loadData();
  }, [selectedTenant]); // eslint-disable-line

  useEffect(() => {
    if (!locationId) {
      setBeds([]);
      setBedId('');
      return;
    }
    listBeds({ locationId, status: 'AVAILABLE' })
      .then(setBeds)
      .catch(() => {});
  }, [locationId]); // eslint-disable-line

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const encounter = await admitPatient({
        patientId,
        class: encounterClass,
        admissionSource: admissionSource || undefined,
        locationId: locationId || undefined,
        bedId: bedId || undefined,
        notes: notes || undefined,
      });
      navigate(`/encounters/${encounter.id}`);
    } catch {
      // error
    }
  };

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 text-center py-20">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Select a Tenant First</h2>
        <p className="text-slate-500 text-sm mb-6">Select a tenant to admit patients.</p>
        <Link
          to="/tenants"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-white no-underline rounded-lg text-sm font-medium transition-colors"
        >
          Select a Tenant
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Admit Patient</h1>
        <p className="text-slate-500 text-sm">Create a new encounter for a patient</p>
      </div>

      <ErrorAlert message={error} className="mb-4" />

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-100 p-6 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Patient</label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Encounter Class</label>
            <select
              value={encounterClass}
              onChange={(e) => setEncounterClass(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              {encounterClasses.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Admission Source
            </label>
            <select
              value={admissionSource}
              onChange={(e) => setAdmissionSource(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">Select source...</option>
              {admissionSources.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">Select location...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.type.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bed</label>
            <select
              value={bedId}
              onChange={(e) => setBedId(e.target.value)}
              disabled={!locationId}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white disabled:opacity-50"
            >
              <option value="">Select bed...</option>
              {beds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.identifier}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none"
            placeholder="Admission notes..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !patientId}
            className="px-6 py-2.5 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Admitting...' : 'Admit Patient'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/patient-flow')}
            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm cursor-pointer hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
