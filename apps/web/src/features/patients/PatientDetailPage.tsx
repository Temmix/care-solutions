import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  usePatients,
  type FhirPatient,
  type FhirPractitioner,
  type FhirOrganization,
  type TimelineEntry,
} from './hooks/use-patients';
import { useCarePlans, type FhirCarePlan } from '../care-plans/hooks/use-care-plans';
import { CarePlanStatusBadge } from '../care-plans/components/CarePlanStatusBadge';
import { useAssessments, type FhirAssessment } from '../assessments/hooks/use-assessments';
import { AssessmentStatusBadge } from '../assessments/components/AssessmentStatusBadge';
import { RiskLevelBadge } from '../assessments/components/RiskLevelBadge';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UK_PHONE_RE = /^(?:\+44|0)\s?\d[\d\s]{8,12}$/;
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

const eventTypeStyles: Record<string, { badge: string; dot: string }> = {
  CREATED: { badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  UPDATED: { badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  ADMISSION: { badge: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  DISCHARGE: { badge: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  TRANSFER: { badge: 'bg-cyan-50 text-cyan-700', dot: 'bg-cyan-500' },
  NOTE: { badge: 'bg-slate-50 text-slate-600', dot: 'bg-slate-400' },
  ASSESSMENT: { badge: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  REFERRAL: { badge: 'bg-pink-50 text-pink-700', dot: 'bg-pink-500' },
  DEMOGRAPHIC_CHANGE: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
};

interface EditForm {
  givenName: string;
  familyName: string;
  phone: string;
  email: string;
  gender: string;
  birthDate: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  gpPractitionerId: string;
  managingOrganizationId: string;
}

type FieldErrors = Record<string, string>;

function validateEditForm(form: EditForm): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.givenName.trim()) errors.givenName = 'First name is required';
  if (!form.familyName.trim()) errors.familyName = 'Last name is required';
  if (!form.birthDate) errors.birthDate = 'Date of birth is required';
  else if (new Date(form.birthDate) > new Date()) errors.birthDate = 'Cannot be in the future';
  if (form.email && !EMAIL_RE.test(form.email)) errors.email = 'Invalid email address';
  if (form.phone && !UK_PHONE_RE.test(form.phone.replace(/\s/g, ' ').trim()))
    errors.phone = 'Invalid UK phone number';
  if (form.postalCode && !UK_POSTCODE_RE.test(form.postalCode.trim()))
    errors.postalCode = 'Invalid UK postcode';
  return errors;
}

function extractRefId(ref?: string): string {
  if (!ref) return '';
  const parts = ref.split('/');
  return parts[parts.length - 1] ?? '';
}

function extractEditForm(patient: FhirPatient): EditForm {
  const name = patient.name?.[0];
  const address = patient.address?.[0];
  return {
    givenName: name?.given?.join(' ') ?? '',
    familyName: name?.family ?? '',
    phone: patient.telecom?.find((t) => t.system === 'phone')?.value ?? '',
    email: patient.telecom?.find((t) => t.system === 'email')?.value ?? '',
    gender: (patient.gender ?? 'UNKNOWN').toUpperCase(),
    birthDate: patient.birthDate ?? '',
    addressLine1: address?.line?.[0] ?? '',
    addressLine2: address?.line?.[1] ?? '',
    city: address?.city ?? '',
    postalCode: address?.postalCode ?? '',
    gpPractitionerId: extractRefId(patient.generalPractitioner?.[0]?.reference),
    managingOrganizationId: extractRefId(patient.managingOrganization?.reference),
  };
}

function InfoRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div>
      <div className="text-xs font-medium text-slate-400 mb-0.5">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  onBlur,
  error,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  type?: string;
  placeholder?: string;
}): React.ReactElement {
  const base =
    'w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors';
  const cls = `${base} ${error ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200'}`;
  return (
    <div>
      <div className="text-xs font-medium text-slate-400 mb-1">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={cls}
      />
      {error && <p className="mt-1 text-xs text-red-600 m-0">{error}</p>}
    </div>
  );
}

export function PatientDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { getPatient, updatePatient, getTimeline, addEvent, getPractitioners, getOrganizations } =
    usePatients();
  const { searchCarePlans } = useCarePlans();
  const { searchAssessments } = useAssessments();
  const [patient, setPatient] = useState<FhirPatient | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [patientCarePlans, setPatientCarePlans] = useState<FhirCarePlan[]>([]);
  const [patientAssessments, setPatientAssessments] = useState<FhirAssessment[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ eventType: 'NOTE', summary: '' });

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editTouched, setEditTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [practitioners, setPractitioners] = useState<FhirPractitioner[]>([]);
  const [organizations, setOrganizations] = useState<FhirOrganization[]>([]);

  const editErrors = useMemo(() => (editForm ? validateEditForm(editForm) : {}), [editForm]);
  const editValid = Object.keys(editErrors).length === 0;

  const showEditError = (field: string): string | undefined =>
    editTouched[field] ? editErrors[field] : undefined;

  const setField = (field: keyof EditForm) => (v: string) =>
    setEditForm((prev) => (prev ? { ...prev, [field]: v } : prev));

  const blurField = (field: string) => () => setEditTouched((prev) => ({ ...prev, [field]: true }));

  const startEditing = async () => {
    if (!patient) return;
    setEditForm(extractEditForm(patient));
    setEditTouched({});
    setEditing(true);
    try {
      const [pracs, orgs] = await Promise.all([getPractitioners(), getOrganizations()]);
      setPractitioners(pracs);
      setOrganizations(orgs);
    } catch {
      // Non-critical — dropdowns will just be empty
    }
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditForm(null);
    setEditTouched({});
  };

  const handleSave = async () => {
    if (!id || !editForm || !editValid) return;

    // Touch all to show errors
    const allTouched: Record<string, boolean> = {};
    for (const key of Object.keys(editForm)) allTouched[key] = true;
    setEditTouched(allTouched);
    if (!editValid) return;

    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        givenName: editForm.givenName.trim(),
        familyName: editForm.familyName.trim(),
        gender: editForm.gender,
        birthDate: editForm.birthDate,
      };
      if (editForm.phone) data.phone = editForm.phone.trim();
      else data.phone = '';
      if (editForm.email) data.email = editForm.email.trim();
      else data.email = '';
      if (editForm.addressLine1) data.addressLine1 = editForm.addressLine1.trim();
      if (editForm.addressLine2) data.addressLine2 = editForm.addressLine2.trim();
      if (editForm.city) data.city = editForm.city.trim();
      if (editForm.postalCode) data.postalCode = editForm.postalCode.trim();
      data.gpPractitionerId = editForm.gpPractitionerId || null;
      data.managingOrganizationId = editForm.managingOrganizationId || null;

      const updated = await updatePatient(id, data);
      setPatient(updated);
      setEditing(false);
      setEditForm(null);
      setEditTouched({});
      // Refresh timeline to show the DEMOGRAPHIC_CHANGE event
      const t = await getTimeline(id, { limit: 50 });
      setTimeline(t.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update patient');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([getPatient(id), getTimeline(id, { limit: 50 })])
      .then(([p, t]) => {
        setPatient(p);
        setTimeline(t.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));

    searchCarePlans({ patientId: id, limit: 10 })
      .then((result) => {
        setPatientCarePlans(
          (result.entry ?? []).map((e) => e.resource).filter((r): r is FhirCarePlan => !!r),
        );
      })
      .catch(() => {});

    searchAssessments({ patientId: id, limit: 5 })
      .then((result) => {
        setPatientAssessments(
          (result.entry ?? []).map((e) => e.resource).filter((r): r is FhirAssessment => !!r),
        );
      })
      .catch(() => {});
  }, [id, getPatient, getTimeline, searchCarePlans, searchAssessments]);

  const handleAddEvent = async () => {
    if (!id || !eventForm.summary.trim()) return;
    try {
      const event = await addEvent(id, {
        eventType: eventForm.eventType,
        summary: eventForm.summary,
      });
      setTimeline((prev) => [event, ...prev]);
      setEventForm({ eventType: 'NOTE', summary: '' });
      setShowEventForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add event');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400 text-sm">Loading patient...</div>
      </div>
    );
  }
  if (error && !patient) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {error}
      </div>
    );
  }
  if (!patient) {
    return <div className="text-slate-500 text-center py-20">Patient not found</div>;
  }

  const name = patient.name?.[0];
  const fullName = `${name?.prefix?.[0] ? `${name.prefix[0]} ` : ''}${name?.given?.join(' ') ?? ''} ${name?.family ?? ''}`;
  const initials = `${name?.given?.[0]?.[0] ?? ''}${name?.family?.[0] ?? ''}`;
  const nhsNumber = patient.identifier?.find((i) => i.system?.includes('nhs'))?.value;
  const address = patient.address?.[0];
  const phone = patient.telecom?.find((t) => t.system === 'phone')?.value;
  const email = patient.telecom?.find((t) => t.system === 'email')?.value;

  return (
    <div>
      {/* Breadcrumb + header */}
      <div className="mb-6">
        <Link
          to="/patients"
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
          Back to Patients
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent text-lg font-semibold">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 mb-0.5">{fullName}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              {nhsNumber && <span className="font-mono">NHS {nhsNumber}</span>}
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${patient.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
              >
                {patient.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          {!editing && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                />
              </svg>
              Edit Patient
            </button>
          )}
          {editing && (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEditing}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium cursor-pointer hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editValid}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Demographics — 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Personal Information</h2>
            {editing && editForm ? (
              <div className="grid grid-cols-2 gap-4">
                <EditField
                  label="First Name *"
                  value={editForm.givenName}
                  onChange={setField('givenName')}
                  onBlur={blurField('givenName')}
                  error={showEditError('givenName')}
                />
                <EditField
                  label="Last Name *"
                  value={editForm.familyName}
                  onChange={setField('familyName')}
                  onBlur={blurField('familyName')}
                  error={showEditError('familyName')}
                />
                <EditField
                  label="Date of Birth *"
                  value={editForm.birthDate}
                  onChange={setField('birthDate')}
                  onBlur={blurField('birthDate')}
                  error={showEditError('birthDate')}
                  type="date"
                />
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-1">Gender</div>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setField('gender')(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white appearance-none outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                </div>
                <EditField
                  label="Phone"
                  value={editForm.phone}
                  onChange={setField('phone')}
                  onBlur={blurField('phone')}
                  error={showEditError('phone')}
                  type="tel"
                  placeholder="+44 7700 900000"
                />
                <EditField
                  label="Email"
                  value={editForm.email}
                  onChange={setField('email')}
                  onBlur={blurField('email')}
                  error={showEditError('email')}
                  type="email"
                  placeholder="patient@example.com"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Date of Birth" value={patient.birthDate ?? '-'} />
                <InfoRow
                  label="Gender"
                  value={(patient.gender ?? 'Unknown')
                    .toLowerCase()
                    .replace(/^./, (c) => c.toUpperCase())}
                />
                <InfoRow label="Phone" value={phone ?? '-'} />
                <InfoRow label="Email" value={email ?? '-'} />
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Address</h2>
            {editing && editForm ? (
              <div className="space-y-3">
                <EditField
                  label="Address Line 1"
                  value={editForm.addressLine1}
                  onChange={setField('addressLine1')}
                />
                <EditField
                  label="Address Line 2"
                  value={editForm.addressLine2}
                  onChange={setField('addressLine2')}
                />
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="City" value={editForm.city} onChange={setField('city')} />
                  <EditField
                    label="Postcode"
                    value={editForm.postalCode}
                    onChange={setField('postalCode')}
                    onBlur={blurField('postalCode')}
                    error={showEditError('postalCode')}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 m-0">
                {address
                  ? [address.line?.join(', '), address.city, address.postalCode]
                      .filter(Boolean)
                      .join(', ')
                  : 'No address on file'}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Care Team</h2>
            {editing && editForm ? (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-1">GP / Practitioner</div>
                  <select
                    value={editForm.gpPractitionerId}
                    onChange={(e) => setField('gpPractitionerId')(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white appearance-none outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  >
                    <option value="">None</option>
                    {practitioners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name?.[0]?.given?.join(' ')} {p.name?.[0]?.family}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-1">
                    Managing Organisation
                  </div>
                  <select
                    value={editForm.managingOrganizationId}
                    onChange={(e) => setField('managingOrganizationId')(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white appearance-none outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  >
                    <option value="">None</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <InfoRow
                  label="GP / Practitioner"
                  value={patient.generalPractitioner?.[0]?.display ?? '-'}
                />
                <InfoRow
                  label="Managing Organisation"
                  value={patient.managingOrganization?.display ?? '-'}
                />
              </div>
            )}
          </div>

          {/* Care Plans */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Care Plans</h2>
              <Link
                to={`/care-plans/new?patientId=${id}`}
                className="text-xs text-accent no-underline hover:underline"
              >
                + New
              </Link>
            </div>
            {patientCarePlans.length === 0 ? (
              <p className="text-sm text-slate-400 m-0">No care plans</p>
            ) : (
              <div className="space-y-2">
                {patientCarePlans.map((cp) => (
                  <Link
                    key={cp.id}
                    to={`/care-plans/${cp.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 no-underline hover:border-slate-200 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">{cp.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {(cp.category?.[0]?.text ?? '').charAt(0) +
                          (cp.category?.[0]?.text ?? '').slice(1).toLowerCase().replace(/_/g, ' ')}
                      </div>
                    </div>
                    <CarePlanStatusBadge status={cp.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Assessments */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Assessments</h2>
              <Link
                to={`/assessments/new?patientId=${id}`}
                className="text-xs text-accent no-underline hover:underline"
              >
                + New
              </Link>
            </div>
            {patientAssessments.length === 0 ? (
              <p className="text-sm text-slate-400 m-0">No assessments</p>
            ) : (
              <div className="space-y-2">
                {patientAssessments.map((a) => {
                  const riskLevel = a.interpretation?.[0]?.coding?.[0]?.code;
                  return (
                    <Link
                      key={a.id}
                      to={`/assessments/${a.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 no-underline hover:border-slate-200 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-900">{a.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {a.toolName ?? a.code.text}
                          {a.valueQuantity?.value != null && (
                            <span className="ml-2 font-mono">
                              {a.valueQuantity.value}
                              {a.valueQuantity.unit ?? ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {riskLevel && <RiskLevelBadge riskLevel={riskLevel} />}
                        <AssessmentStatusBadge status={a.status} isReviewed={!!a.reviewedBy} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Timeline — 3 cols */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-100">
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Timeline</h2>
            <button
              onClick={() => setShowEventForm(!showEventForm)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors border-none ${
                showEventForm
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-accent text-white hover:bg-accent-dark'
              }`}
            >
              {showEventForm ? (
                'Cancel'
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Event
                </>
              )}
            </button>
          </div>

          {showEventForm && (
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex gap-3 mb-3">
                <select
                  value={eventForm.eventType}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, eventType: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white appearance-none"
                >
                  {['NOTE', 'ADMISSION', 'DISCHARGE', 'TRANSFER', 'ASSESSMENT', 'REFERRAL'].map(
                    (t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <textarea
                placeholder="Describe the event..."
                value={eventForm.summary}
                onChange={(e) => setEventForm((prev) => ({ ...prev, summary: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white resize-y box-border placeholder:text-slate-400"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleAddEvent}
                  disabled={!eventForm.summary.trim()}
                  className="px-4 py-2 bg-accent hover:bg-accent-dark text-white border-none rounded-lg cursor-pointer text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save Event
                </button>
              </div>
            </div>
          )}

          <div className="max-h-150 overflow-y-auto">
            {timeline.length === 0 && (
              <div className="text-slate-400 text-sm text-center py-12">No events recorded yet</div>
            )}
            <div className="divide-y divide-slate-50">
              {timeline.map((event) => {
                const styles = eventTypeStyles[event.eventType] ?? {
                  badge: 'bg-slate-50 text-slate-500',
                  dot: 'bg-slate-400',
                };
                return (
                  <div key={event.id} className="flex gap-4 px-6 py-4">
                    <div className="flex flex-col items-center pt-1">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${styles.dot}`} />
                      <div className="w-px flex-1 bg-slate-100 mt-1" />
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[0.65rem] px-2 py-0.5 rounded-full font-medium ${styles.badge}`}
                        >
                          {event.eventType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[0.7rem] text-slate-400">
                          {new Date(event.occurredAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-slate-900 mt-1">{event.summary}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        by {event.recordedBy.firstName} {event.recordedBy.lastName}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
