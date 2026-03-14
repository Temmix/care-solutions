const COLOURS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-emerald-50 text-emerald-700',
  'on-hold': 'bg-amber-50 text-amber-700',
  completed: 'bg-blue-50 text-blue-700',
  stopped: 'bg-red-50 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
  'entered-in-error': 'bg-red-100 text-red-600',
};

export function PrescriptionStatusBadge({ status }: { status: string }): React.ReactElement {
  const cls = COLOURS[status] ?? 'bg-slate-100 text-slate-600';
  const label = status
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
