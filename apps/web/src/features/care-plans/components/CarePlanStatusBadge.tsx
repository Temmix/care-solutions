const statusConfig: Record<string, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-slate-50 text-slate-600' },
  active: { label: 'Active', classes: 'bg-emerald-50 text-emerald-700' },
  completed: { label: 'Completed', classes: 'bg-blue-50 text-blue-700' },
  revoked: { label: 'Cancelled', classes: 'bg-red-50 text-red-700' },
  'entered-in-error': { label: 'Error', classes: 'bg-amber-50 text-amber-700' },
};

export function CarePlanStatusBadge({ status }: { status: string }): React.ReactElement {
  const config = statusConfig[status] ?? { label: status, classes: 'bg-slate-50 text-slate-600' };
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${config.classes}`}>
      {config.label}
    </span>
  );
}
