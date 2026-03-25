import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import type { TenantMembership } from '../../types/auth';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  CLINICIAN: 'Clinician',
  NURSE: 'Nurse',
  CARER: 'Carer',
  PATIENT: 'Patient',
};

const typeColors: Record<string, string> = {
  CARE_HOME: 'bg-teal-50 text-teal-700 border-teal-200',
  GP_PRACTICE: 'bg-blue-50 text-blue-700 border-blue-200',
  HOSPITAL: 'bg-purple-50 text-purple-700 border-purple-200',
  COMMUNITY_SERVICE: 'bg-orange-50 text-orange-700 border-orange-200',
  MENTAL_HEALTH_TRUST: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

function formatType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SelectTenantPage(): React.ReactElement {
  const { user, memberships, selectedTenant, selectTenant } = useAuth();
  const navigate = useNavigate();

  const handleSelect = async (membership: TenantMembership) => {
    await selectTenant({
      id: membership.organizationId,
      name: membership.organization.name,
      type: membership.organization.type,
      enabledModules: [],
    });
    navigate('/app');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Select Organisation</h1>
        <p className="text-slate-500 text-sm">
          Welcome back, {user?.firstName}. You belong to {memberships.length} organisation
          {memberships.length !== 1 ? 's' : ''}. Select one to continue.
        </p>
      </div>

      <div className="space-y-3">
        {memberships.map((m) => {
          const isSelected = selectedTenant?.id === m.organizationId;
          const typeCode = m.organization.type;

          return (
            <button
              key={m.organizationId}
              type="button"
              onClick={() => handleSelect(m)}
              className={`w-full bg-white rounded-xl p-5 text-left cursor-pointer border-2 transition-all hover:shadow-md ${
                isSelected
                  ? 'border-accent ring-2 ring-accent/20 shadow-md'
                  : 'border-slate-100 hover:border-accent/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-11 h-11 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isSelected ? 'bg-accent text-white' : 'bg-accent/10 text-accent'
                    }`}
                  >
                    {m.organization.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 m-0">
                      {m.organization.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-block text-[0.65rem] px-2 py-0.5 rounded-full font-medium border ${typeColors[typeCode] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}
                      >
                        {formatType(typeCode)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="flex items-center gap-1.5 text-accent text-xs font-medium">
                    <svg
                      className="w-5 h-5"
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
                    Selected
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {memberships.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 text-center py-16">
          <div className="text-slate-400 text-sm">
            You are not a member of any organisation. Contact your administrator.
          </div>
        </div>
      )}
    </div>
  );
}
