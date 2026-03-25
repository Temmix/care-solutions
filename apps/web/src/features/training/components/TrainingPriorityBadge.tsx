const priorityStyles: Record<string, string> = {
  MANDATORY: 'bg-red-50 text-red-700',
  RECOMMENDED: 'bg-amber-50 text-amber-700',
  OPTIONAL: 'bg-slate-100 text-slate-600',
};

const priorityLabels: Record<string, string> = {
  MANDATORY: 'Mandatory',
  RECOMMENDED: 'Recommended',
  OPTIONAL: 'Optional',
};

export function TrainingPriorityBadge({ priority }: { priority: string }) {
  const style = priorityStyles[priority] ?? 'bg-slate-100 text-slate-600';
  const label = priorityLabels[priority] ?? priority;
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${style}`}>
      {label}
    </span>
  );
}
