import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import {
  usePractitioners,
  type Practitioner,
  type PractitionerForm,
} from './hooks/use-practitioners';
import { useSpecialtyTypes, type SpecialtyTypeOption } from './hooks/use-specialty-types';
import { ErrorAlert } from '../../components/ErrorAlert';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UK_PHONE_RE = /^(?:\+44|0)\s?\d[\d\s]{8,12}$/;

type FieldErrors = Record<string, string>;

function validateForm(form: PractitionerForm): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.givenName.trim()) errors.givenName = 'First name is required';
  if (!form.familyName.trim()) errors.familyName = 'Last name is required';
  if (form.email && !EMAIL_RE.test(form.email)) errors.email = 'Enter a valid email address';
  if (form.phone && !UK_PHONE_RE.test(form.phone.replace(/\s/g, ' ').trim()))
    errors.phone = 'Enter a valid UK phone number';
  return errors;
}

const emptyForm: PractitionerForm = {
  givenName: '',
  familyName: '',
  gender: 'UNKNOWN',
  phone: '',
  email: '',
  specialty: '',
  registrationNumber: '',
};

function extractForm(p: Practitioner): PractitionerForm {
  const name = p.name?.[0];
  return {
    givenName: name?.given?.join(' ') ?? '',
    familyName: name?.family ?? '',
    gender: (p.gender ?? 'unknown').toUpperCase(),
    phone: p.telecom?.find((t) => t.system === 'phone')?.value ?? '',
    email: p.telecom?.find((t) => t.system === 'email')?.value ?? '',
    specialty: p.qualification?.[0]?.code?.text ?? '',
    registrationNumber: p.qualification?.[0]?.identifier?.[0]?.value ?? '',
  };
}

function FieldError({ message }: { message?: string }): React.ReactElement | null {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600 m-0">{message}</p>;
}

function PractitionerFormModal({
  title,
  initial,
  onSave,
  onCancel,
  saving,
  specialtyTypes,
}: {
  title: string;
  initial: PractitionerForm;
  onSave: (form: PractitionerForm) => void;
  onCancel: () => void;
  saving: boolean;
  specialtyTypes: SpecialtyTypeOption[];
}): React.ReactElement {
  const [form, setForm] = useState<PractitionerForm>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => validateForm(form), [form]);
  const isValid = Object.keys(errors).length === 0;

  const set =
    (field: keyof PractitionerForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const blur = (field: string) => () => setTouched((prev) => ({ ...prev, [field]: true }));
  const showError = (field: string): string | undefined =>
    touched[field] ? errors[field] : undefined;

  const handleSubmit = () => {
    const allTouched: Record<string, boolean> = {};
    for (const key of Object.keys(form)) allTouched[key] = true;
    setTouched(allTouched);
    if (!isValid) return;
    onSave(form);
  };

  const inputBase =
    'w-full px-3 py-2.5 border rounded-lg text-sm bg-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors';
  const inputClass = (field: string): string =>
    `${inputBase} ${showError(field) ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200'}`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-medium text-slate-500">
                First Name *
              </label>
              <input
                value={form.givenName}
                onChange={set('givenName')}
                onBlur={blur('givenName')}
                className={inputClass('givenName')}
              />
              <FieldError message={showError('givenName')} />
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium text-slate-500">Last Name *</label>
              <input
                value={form.familyName}
                onChange={set('familyName')}
                onBlur={blur('familyName')}
                className={inputClass('familyName')}
              />
              <FieldError message={showError('familyName')} />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-medium text-slate-500">Gender</label>
            <select
              value={form.gender}
              onChange={set('gender')}
              className={`${inputBase} border-slate-200 appearance-none`}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-medium text-slate-500">Phone</label>
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
              <label className="block mb-1.5 text-xs font-medium text-slate-500">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                onBlur={blur('email')}
                placeholder="doctor@nhs.uk"
                className={inputClass('email')}
              />
              <FieldError message={showError('email')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-medium text-slate-500">Specialty</label>
              <select
                value={form.specialty}
                onChange={set('specialty')}
                className={`${inputBase} border-slate-200 appearance-none`}
              >
                <option value="">— Select specialty —</option>
                {(() => {
                  const grouped = new Map<string, SpecialtyTypeOption[]>();
                  for (const t of specialtyTypes) {
                    const cat = t.category ?? 'Other';
                    if (!grouped.has(cat)) grouped.set(cat, []);
                    grouped.get(cat)!.push(t);
                  }
                  return [...grouped.entries()].map(([cat, items]) => (
                    <optgroup key={cat} label={cat}>
                      {items.map((t) => (
                        <option key={t.code} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                  ));
                })()}
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium text-slate-500">
                Registration No.
              </label>
              <input
                value={form.registrationNumber}
                onChange={set('registrationNumber')}
                placeholder="e.g. GMC 1234567"
                className={`${inputBase} border-slate-200`}
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium cursor-pointer hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !isValid}
            className="px-4 py-2 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PractitionersPage(): React.ReactElement {
  const { user, isSuperAdmin, selectedTenant } = useAuth();
  const { list, create, update } = usePractitioners();
  const { types: specialtyTypes } = useSpecialtyTypes();
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Practitioner | null>(null);
  const [saving, setSaving] = useState(false);
  const limit = 20;

  const loadPractitioners = async (p = page) => {
    setLoading(true);
    try {
      const result = await list(p, limit);
      setPractitioners(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPractitioners();
  }, [page]); // eslint-disable-line

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
              d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Select a Tenant First</h2>
        <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
          Select a tenant from the Tenants page before managing practitioners.
        </p>
        <Link
          to="/tenants"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-white no-underline rounded-lg text-sm font-medium transition-colors"
        >
          Select a Tenant
        </Link>
      </div>
    );
  }

  const handleCreate = async (form: PractitionerForm) => {
    if (!user) return;
    setSaving(true);
    try {
      await create({ ...form, userId: user.id });
      setShowCreate(false);
      await loadPractitioners(1);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create practitioner');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (form: PractitionerForm) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await update(editTarget.id, form);
      setEditTarget(null);
      await loadPractitioners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update practitioner');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (p: Practitioner) => {
    try {
      await update(p.id, { active: false });
      await loadPractitioners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate practitioner');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Practitioners</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage GPs, clinicians, and other care professionals
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors"
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
          Add Practitioner
        </button>
      </div>

      <ErrorAlert message={error} className="mb-6" />

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-6 py-3 text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-6 py-3 text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider">
                Specialty
              </th>
              <th className="text-left px-6 py-3 text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="text-left px-6 py-3 text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider">
                Reg. No.
              </th>
              <th className="text-left px-6 py-3 text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && practitioners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                  Loading practitioners...
                </td>
              </tr>
            )}
            {!loading && practitioners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                  No practitioners found. Add your first practitioner to get started.
                </td>
              </tr>
            )}
            {practitioners.map((p) => {
              const name = p.name?.[0];
              const fullName = `${name?.given?.join(' ') ?? ''} ${name?.family ?? ''}`.trim();
              const initials = `${name?.given?.[0]?.[0] ?? ''}${name?.family?.[0] ?? ''}`;
              const phone = p.telecom?.find((t) => t.system === 'phone')?.value;
              const email = p.telecom?.find((t) => t.system === 'email')?.value;
              const specialty = p.qualification?.[0]?.code?.text;
              const regNo = p.qualification?.[0]?.identifier?.[0]?.value;

              return (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-semibold">
                        {initials}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{fullName}</div>
                        <div className="text-xs text-slate-400 capitalize">
                          {(p.gender ?? 'unknown').toLowerCase()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{specialty ?? '-'}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">{phone ?? '-'}</div>
                    <div className="text-xs text-slate-400">{email ?? ''}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{regNo ?? '-'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.active !== false
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {p.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditTarget(p)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Edit
                      </button>
                      {p.active !== false && (
                        <button
                          onClick={() => handleDeactivate(p)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
            <div className="text-xs text-slate-400">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <PractitionerFormModal
          title="Add Practitioner"
          initial={emptyForm}
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
          saving={saving}
          specialtyTypes={specialtyTypes}
        />
      )}

      {editTarget && (
        <PractitionerFormModal
          title="Edit Practitioner"
          initial={extractForm(editTarget)}
          onSave={handleUpdate}
          onCancel={() => setEditTarget(null)}
          saving={saving}
          specialtyTypes={specialtyTypes}
        />
      )}
    </div>
  );
}
