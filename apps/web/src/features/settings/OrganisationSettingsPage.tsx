import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api-client';

const ORG_TYPES = [
  { value: 'CARE_HOME', label: 'Care Home' },
  { value: 'GP_PRACTICE', label: 'GP Practice' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'COMMUNITY_SERVICE', label: 'Community Service' },
  { value: 'MENTAL_HEALTH_TRUST', label: 'Mental Health Trust' },
  { value: 'OTHER', label: 'Other' },
];

interface FhirOrganization {
  id: string;
  name: string;
  active: boolean;
  type: Array<{ coding: Array<{ code: string; display: string }> }>;
  identifier?: Array<{ system: string; value: string }>;
  telecom?: Array<{ system: string; value: string }>;
  address?: Array<{ line?: string[]; city?: string; postalCode?: string; country?: string }>;
}

interface OrgBundle {
  total: number;
  entry: Array<{ resource: FhirOrganization }>;
}

interface OrgForm {
  name: string;
  type: string;
  odsCode: string;
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  postalCode: string;
}

function fhirToForm(org: FhirOrganization): OrgForm {
  const phone = org.telecom?.find((t) => t.system === 'phone')?.value ?? '';
  const email = org.telecom?.find((t) => t.system === 'email')?.value ?? '';
  const addr = org.address?.[0];
  const odsCode =
    org.identifier?.find((i) => i.system === 'https://fhir.nhs.uk/Id/ods-organization-code')
      ?.value ?? '';

  return {
    name: org.name,
    type: org.type?.[0]?.coding?.[0]?.code ?? 'OTHER',
    odsCode,
    phone,
    email,
    addressLine1: addr?.line?.[0] ?? '',
    city: addr?.city ?? '',
    postalCode: addr?.postalCode ?? '',
  };
}

const inputClass =
  'w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-colors';

export function OrganisationSettingsPage(): React.ReactElement {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [form, setForm] = useState<OrgForm>({
    name: '',
    type: 'CARE_HOME',
    odsCode: '',
    phone: '',
    email: '',
    addressLine1: '',
    city: '',
    postalCode: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api
      .get<OrgBundle>('/organizations?limit=1')
      .then((bundle) => {
        const org = bundle.entry[0]?.resource;
        if (org) {
          setOrgId(org.id);
          setForm(fhirToForm(org));
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load organisation'))
      .finally(() => setLoading(false));
  }, []);

  const set =
    (field: keyof OrgForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    if (!orgId) return;
    if (!form.name.trim()) {
      setError('Organisation name is required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.patch(`/organizations/${orgId}`, {
        name: form.name.trim(),
        type: form.type,
        odsCode: form.odsCode.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        addressLine1: form.addressLine1.trim() || null,
        city: form.city.trim() || null,
        postalCode: form.postalCode.trim() || null,
      });
      setSuccess('Organisation details updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update organisation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400 text-sm">Loading organisation details...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/settings"
          className="text-sm text-accent no-underline hover:underline inline-flex items-center gap-1 mb-3"
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
          Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Organisation Details</h1>
        <p className="text-sm text-slate-500 mt-1">
          Update your organisation's name, contact information, and address.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
          {success}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-6">
        {/* General */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-4">General</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Organisation Name *
              </label>
              <input
                className={inputClass}
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Sunrise Care Home"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Organisation Type
              </label>
              <select className={inputClass} value={form.type} onChange={set('type')}>
                {ORG_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ODS Code</label>
              <input
                className={inputClass}
                value={form.odsCode}
                onChange={set('odsCode')}
                placeholder="e.g. RGT01"
              />
              <p className="text-[0.65rem] text-slate-400 mt-1">
                Organisation Data Service code (NHS England)
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="border-t border-slate-100 pt-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input
                type="tel"
                className={inputClass}
                value={form.phone}
                onChange={set('phone')}
                placeholder="0123 456 7890"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={set('email')}
                placeholder="info@organisation.nhs.uk"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="border-t border-slate-100 pt-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Address</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Street Address
              </label>
              <input
                className={inputClass}
                value={form.addressLine1}
                onChange={set('addressLine1')}
                placeholder="123 High Street"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                <input
                  className={inputClass}
                  value={form.city}
                  onChange={set('city')}
                  placeholder="e.g. London"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Postcode</label>
                <input
                  className={inputClass}
                  value={form.postalCode}
                  onChange={set('postalCode')}
                  placeholder="e.g. SW1A 1AA"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-100 pt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 text-sm text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-medium"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
