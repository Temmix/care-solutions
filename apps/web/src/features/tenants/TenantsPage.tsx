import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api-client';
import { useAuth } from '../../hooks/use-auth';

interface FhirOrganization {
  id: string;
  name: string;
  active: boolean;
  type: Array<{ coding: Array<{ code: string; display: string }> }>;
  telecom?: Array<{ system: string; value: string }>;
  address?: Array<{ line?: string[]; city?: string; postalCode?: string }>;
}

interface OrgBundle {
  total: number;
  entry: Array<{ resource: FhirOrganization }>;
}

interface SubMap {
  [orgId: string]: { tier: string; status: string };
}

function formatType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const typeColors: Record<string, string> = {
  CARE_HOME: 'bg-teal-50 text-teal-700 border-teal-200',
  GP_PRACTICE: 'bg-blue-50 text-blue-700 border-blue-200',
  HOSPITAL: 'bg-purple-50 text-purple-700 border-purple-200',
  COMMUNITY_SERVICE: 'bg-orange-50 text-orange-700 border-orange-200',
  MENTAL_HEALTH_TRUST: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const tierColors: Record<string, string> = {
  FREE: 'bg-slate-100 text-slate-600',
  STARTER: 'bg-blue-50 text-blue-700',
  PROFESSIONAL: 'bg-violet-50 text-violet-700',
  ENTERPRISE: 'bg-amber-50 text-amber-700',
};

const tierLabels: Record<string, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

export function TenantsPage(): React.ReactElement {
  const [orgs, setOrgs] = useState<FhirOrganization[]>([]);
  const [total, setTotal] = useState(0);
  const [subs, setSubs] = useState<SubMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { selectTenant, selectedTenant } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get<OrgBundle>('/organizations?limit=100'),
      api.get<SubMap>('/billing/subscriptions').catch(() => ({}) as SubMap),
    ])
      .then(([bundle, subMap]) => {
        setOrgs(bundle.entry.map((e) => e.resource));
        setTotal(bundle.total);
        setSubs(subMap);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectTenant = (org: FhirOrganization) => {
    const typeCode = org.type?.[0]?.coding?.[0]?.code ?? 'OTHER';
    selectTenant({ id: org.id, name: org.name, type: typeCode });
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400 text-sm">Loading tenants...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Tenants</h1>
        <p className="text-slate-500 text-sm">
          {total} organisation(s) registered. Select one to manage its data.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
        {orgs.map((org) => {
          const typeCode = org.type?.[0]?.coding?.[0]?.code ?? 'OTHER';
          const phone = org.telecom?.find((t) => t.system === 'phone')?.value;
          const email = org.telecom?.find((t) => t.system === 'email')?.value;
          const addr = org.address?.[0];
          const isSelected = selectedTenant?.id === org.id;
          const sub = subs[org.id];
          const tier = sub?.tier ?? 'FREE';

          return (
            <button
              key={org.id}
              type="button"
              onClick={() => handleSelectTenant(org)}
              className={`bg-white rounded-xl p-6 text-left cursor-pointer border-2 transition-all hover:shadow-md ${
                isSelected
                  ? 'border-accent ring-2 ring-accent/20 shadow-md'
                  : 'border-slate-100 hover:border-accent/40'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isSelected ? 'bg-accent text-white' : 'bg-accent/10 text-accent'
                    }`}
                  >
                    {org.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 m-0">{org.name}</h3>
                    <span
                      className={`inline-block text-[0.65rem] px-2 py-0.5 rounded-full font-medium border mt-1 ${typeColors[typeCode] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}
                    >
                      {formatType(typeCode)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      org.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {org.active ? 'Active' : 'Inactive'}
                  </span>
                  <span
                    className={`text-[0.65rem] px-2 py-0.5 rounded-full font-semibold ${tierColors[tier] ?? tierColors.FREE}`}
                  >
                    {tierLabels[tier] ?? tier}
                  </span>
                </div>
              </div>

              <div className="text-sm text-slate-500 space-y-1 mt-4">
                {addr && (
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                      />
                    </svg>
                    <span>
                      {addr.line?.join(', ')}
                      {addr.city ? `, ${addr.city}` : ''}
                      {addr.postalCode ? ` ${addr.postalCode}` : ''}
                    </span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-slate-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                      />
                    </svg>
                    <span>{phone}</span>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-slate-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                      />
                    </svg>
                    <span>{email}</span>
                  </div>
                )}
              </div>

              {isSelected && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-accent text-xs font-medium">
                  <svg
                    className="w-4 h-4"
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
                  Currently selected
                </div>
              )}
            </button>
          );
        })}
      </div>

      {orgs.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 text-center py-16">
          <div className="text-slate-400 text-sm">No organisations found.</div>
        </div>
      )}
    </div>
  );
}
