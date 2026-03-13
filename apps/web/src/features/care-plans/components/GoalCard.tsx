import type { FhirCarePlanGoal } from '../hooks/use-care-plans';

const goalStatusConfig: Record<string, { label: string; classes: string }> = {
  proposed: { label: 'Proposed', classes: 'bg-slate-50 text-slate-600' },
  accepted: { label: 'Accepted', classes: 'bg-blue-50 text-blue-700' },
  active: { label: 'Active', classes: 'bg-emerald-50 text-emerald-700' },
  completed: { label: 'Completed', classes: 'bg-teal-50 text-teal-700' },
  cancelled: { label: 'Cancelled', classes: 'bg-red-50 text-red-700' },
};

export function GoalCard({
  goal,
  onRemove,
}: {
  goal: FhirCarePlanGoal;
  onRemove?: () => void;
}): React.ReactElement {
  const config = goalStatusConfig[goal.status] ?? {
    label: goal.status,
    classes: 'bg-slate-50 text-slate-600',
  };

  return (
    <div className="border border-slate-100 rounded-lg p-4 hover:border-slate-200 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm text-slate-900 font-medium m-0 flex-1">{goal.description}</p>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.classes}`}>
            {config.label}
          </span>
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-slate-300 hover:text-red-500 bg-transparent border-none cursor-pointer p-0 transition-colors"
              title="Remove goal"
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
      </div>
      {(goal.target?.dueDate || goal.target?.measure?.text) && (
        <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
          {goal.target.dueDate && (
            <span>Due: {new Date(goal.target.dueDate).toLocaleDateString()}</span>
          )}
          {goal.target.measure?.text && <span>Measure: {goal.target.measure.text}</span>}
        </div>
      )}
      {goal.note && <p className="text-xs text-slate-500 mt-2 m-0">{goal.note}</p>}
    </div>
  );
}
