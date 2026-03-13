const statusStyles: Record<string, string> = {
  preliminary: 'bg-amber-50 text-amber-700',
  final: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
  'entered-in-error': 'bg-slate-100 text-slate-500',
};

const statusLabels: Record<string, string> = {
  preliminary: 'Draft',
  final: 'Completed',
  cancelled: 'Cancelled',
  'entered-in-error': 'Error',
};

interface Props {
  status: string;
  isReviewed?: boolean;
}

export function AssessmentStatusBadge({ status, isReviewed }: Props): React.ReactElement {
  const label = isReviewed ? 'Reviewed' : (statusLabels[status] ?? status);
  const style = isReviewed
    ? 'bg-blue-50 text-blue-700'
    : (statusStyles[status] ?? 'bg-slate-100 text-slate-500');

  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${style}`}>
      {label}
    </span>
  );
}
