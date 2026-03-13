import type { FhirCarePlanActivity } from '../hooks/use-care-plans';

const activityStatusConfig: Record<string, { label: string; classes: string }> = {
  'not-started': { label: 'Not Started', classes: 'bg-slate-50 text-slate-600' },
  'in-progress': { label: 'In Progress', classes: 'bg-blue-50 text-blue-700' },
  completed: { label: 'Completed', classes: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Cancelled', classes: 'bg-red-50 text-red-700' },
};

const typeIcons: Record<string, string> = {
  medication: 'Medication',
  exercise: 'Exercise',
  appointment: 'Appointment',
  observation: 'Observation',
  education: 'Education',
  referral: 'Referral',
  other: 'Other',
};

export function ActivityCard({
  activity,
  onRemove,
}: {
  activity: FhirCarePlanActivity;
  onRemove?: () => void;
}): React.ReactElement {
  const { detail } = activity;
  const statusCfg = activityStatusConfig[detail.status] ?? {
    label: detail.status,
    classes: 'bg-slate-50 text-slate-600',
  };
  const typeLabel = typeIcons[detail.kind] ?? detail.kind;

  return (
    <div className="border border-slate-100 rounded-lg p-4 hover:border-slate-200 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-accent bg-accent/5 px-2 py-0.5 rounded">
              {typeLabel}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.classes}`}>
              {statusCfg.label}
            </span>
          </div>
          <p className="text-sm text-slate-900 m-0">{detail.description}</p>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-slate-300 hover:text-red-500 bg-transparent border-none cursor-pointer p-0 shrink-0 transition-colors"
            title="Remove activity"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
        {detail.scheduledString && (
          <span>Scheduled: {new Date(detail.scheduledString).toLocaleString()}</span>
        )}
        {detail.performer?.[0]?.display && <span>Assigned: {detail.performer[0].display}</span>}
      </div>
    </div>
  );
}
