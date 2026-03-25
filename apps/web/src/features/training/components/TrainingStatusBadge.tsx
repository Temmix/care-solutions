const statusStyles: Record<string, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  EXPIRED: 'bg-red-50 text-red-600',
  OVERDUE: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
  OVERDUE: 'Overdue',
};

export function TrainingStatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] ?? 'bg-slate-100 text-slate-600';
  const label = statusLabels[status] ?? status;
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${style}`}>
      {label}
    </span>
  );
}
