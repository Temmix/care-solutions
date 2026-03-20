import { useState, useMemo, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePatients } from './hooks/use-patients';
import { useAuth } from '../../hooks/use-auth';
import { ErrorAlert } from '../../components/ErrorAlert';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UK_PHONE_RE = /^(?:\+44|0)\s?\d[\d\s]{8,12}$/;
const NHS_RE = /^\d{3}\s?\d{3}\s?\d{4}$/;
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

type FieldErrors = Record<string, string>;

function validateForm(form: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.givenName.trim()) errors.givenName = 'First name is required';
  if (!form.familyName.trim()) errors.familyName = 'Last name is required';
  if (!form.birthDate) {
    errors.birthDate = 'Date of birth is required';
  } else if (new Date(form.birthDate) > new Date()) {
    errors.birthDate = 'Date of birth cannot be in the future';
  }

  if (form.email && !EMAIL_RE.test(form.email)) {
    errors.email = 'Enter a valid email address';
  }
  if (form.phone && !UK_PHONE_RE.test(form.phone.replace(/\s/g, ' ').trim())) {
    errors.phone = 'Enter a valid UK phone number (e.g. +44 7700 900000)';
  }
  if (form.nhsNumber && !NHS_RE.test(form.nhsNumber.trim())) {
    errors.nhsNumber = 'NHS number must be 10 digits (e.g. 000 000 0000)';
  }
  if (form.postalCode && !UK_POSTCODE_RE.test(form.postalCode.trim())) {
    errors.postalCode = 'Enter a valid UK postcode (e.g. SW1A 1AA)';
  }

  return errors;
}

function FieldError({ message }: { message?: string }): React.ReactElement | null {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600 m-0">{message}</p>;
}

export function PatientCreatePage(): React.ReactElement {
  const { isSuperAdmin, selectedTenant } = useAuth();
  const { createPatient } = usePatients();
  const navigate = useNavigate();

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 text-center py-20">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Select a Tenant First</h2>
        <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
          Select a tenant from the Tenants page before creating a patient.
        </p>
        <Link
          to="/app/tenants"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-white no-underline rounded-lg text-sm font-medium transition-colors"
        >
          Select a Tenant
        </Link>
      </div>
    );
  }

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    givenName: '',
    middleName: '',
    familyName: '',
    prefix: '',
    gender: 'UNKNOWN',
    birthDate: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    nhsNumber: '',
    mrn: '',
  });

  const fieldErrors = useMemo(() => validateForm(form), [form]);
  const isValid = Object.keys(fieldErrors).length === 0;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const blur = (field: string) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  const showError = (field: string): string | undefined =>
    touched[field] ? fieldErrors[field] : undefined;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched to show any remaining errors
    const allTouched: Record<string, boolean> = {};
    for (const key of Object.keys(form)) allTouched[key] = true;
    setTouched(allTouched);

    if (!isValid) return;

    setError('');
    setIsSubmitting(true);

    try {
      const data: Record<string, unknown> = {
        givenName: form.givenName.trim(),
        familyName: form.familyName.trim(),
        gender: form.gender,
        birthDate: form.birthDate,
      };
      if (form.prefix) data.prefix = form.prefix.trim();
      if (form.middleName) data.middleName = form.middleName.trim();
      if (form.phone) data.phone = form.phone.trim();
      if (form.email) data.email = form.email.trim();
      if (form.addressLine1) data.addressLine1 = form.addressLine1.trim();
      if (form.addressLine2) data.addressLine2 = form.addressLine2.trim();
      if (form.city) data.city = form.city.trim();
      if (form.postalCode) data.postalCode = form.postalCode.trim();
      if (form.nhsNumber) data.nhsNumber = form.nhsNumber.replace(/\s/g, '');
      if (form.mrn) data.mrn = form.mrn.trim();

      const patient = await createPatient(data);
      navigate(`/patients/${patient.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase =
    'w-full px-4 py-2.5 border rounded-lg text-sm bg-white placeholder:text-slate-400 transition-colors outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent';
  const inputClass = (field: string): string =>
    `${inputBase} ${showError(field) ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200'}`;
  const labelClass = 'block mb-1.5 text-xs font-medium text-slate-500';

  return (
    <div>
      {/* Breadcrumb + header */}
      <div className="mb-6">
        <Link
          to="/app/patients"
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
        <h1 className="text-2xl font-bold text-slate-900">Register Patient</h1>
      </div>

      <ErrorAlert message={error} className="mb-6" />

      <form onSubmit={handleSubmit} className="max-w-3xl" noValidate>
        {/* Personal Details */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Personal Details</h3>
          <div className="grid grid-cols-[0.5fr_1fr_1fr_1fr] gap-4">
            <div>
              <label className={labelClass}>Prefix</label>
              <input
                value={form.prefix}
                onChange={set('prefix')}
                placeholder="Mr, Mrs"
                className={inputClass('prefix')}
              />
            </div>
            <div>
              <label className={labelClass}>First Name *</label>
              <input
                value={form.givenName}
                onChange={set('givenName')}
                onBlur={blur('givenName')}
                className={inputClass('givenName')}
              />
              <FieldError message={showError('givenName')} />
            </div>
            <div>
              <label className={labelClass}>Middle Name</label>
              <input
                value={form.middleName}
                onChange={set('middleName')}
                className={inputClass('middleName')}
              />
            </div>
            <div>
              <label className={labelClass}>Last Name *</label>
              <input
                value={form.familyName}
                onChange={set('familyName')}
                onBlur={blur('familyName')}
                className={inputClass('familyName')}
              />
              <FieldError message={showError('familyName')} />
            </div>
          </div>
        </div>

        {/* Gender & DOB */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Demographics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Gender *</label>
              <select
                value={form.gender}
                onChange={set('gender')}
                className={`${inputClass('gender')} appearance-none`}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Date of Birth *</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={set('birthDate')}
                onBlur={blur('birthDate')}
                max={new Date().toISOString().split('T')[0]}
                className={inputClass('birthDate')}
              />
              <FieldError message={showError('birthDate')} />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Contact Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                onBlur={blur('phone')}
                placeholder="+44 7700 900000"
                className={inputClass('phone')}
              />
              <FieldError message={showError('phone')} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                onBlur={blur('email')}
                placeholder="patient@example.com"
                className={inputClass('email')}
              />
              <FieldError message={showError('email')} />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Address</h3>
          <div className="space-y-3">
            <input
              placeholder="Address Line 1"
              value={form.addressLine1}
              onChange={set('addressLine1')}
              className={inputClass('addressLine1')}
            />
            <input
              placeholder="Address Line 2"
              value={form.addressLine2}
              onChange={set('addressLine2')}
              className={inputClass('addressLine2')}
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="City"
                value={form.city}
                onChange={set('city')}
                className={inputClass('city')}
              />
              <div>
                <input
                  placeholder="Postcode"
                  value={form.postalCode}
                  onChange={set('postalCode')}
                  onBlur={blur('postalCode')}
                  className={inputClass('postalCode')}
                />
                <FieldError message={showError('postalCode')} />
              </div>
            </div>
          </div>
        </div>

        {/* Identifiers */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 mb-8">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Identifiers</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>NHS Number</label>
              <input
                value={form.nhsNumber}
                onChange={set('nhsNumber')}
                onBlur={blur('nhsNumber')}
                placeholder="000 000 0000"
                className={inputClass('nhsNumber')}
              />
              <FieldError message={showError('nhsNumber')} />
            </div>
            <div>
              <label className={labelClass}>MRN</label>
              <input value={form.mrn} onChange={set('mrn')} className={inputClass('mrn')} />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-dark text-white border-none rounded-lg cursor-pointer text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Registering...' : 'Register Patient'}
        </button>
      </form>
    </div>
  );
}
