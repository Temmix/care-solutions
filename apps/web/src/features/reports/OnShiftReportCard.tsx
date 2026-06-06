import { useState } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert';
import { ReportModal } from './ReportModal';
import { useShiftReports } from './hooks/use-shift-reports';
import { CATEGORY_LABELS, type ShiftReportPriority } from './types';

const PRIORITY_BADGE: Record<ShiftReportPriority, { bg: string; text: string; label: string }> = {
  NORMAL: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Normal' },
  CONCERN: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Concern' },
  URGENT: { bg: 'bg-red-50', text: 'text-red-600', label: 'Urgent' },
};

/**
 * On-shift care reporting, shown on the Clock page. Only renders once the worker
 * is clocked in and within the reporting window for an open shift.
 */
export function OnShiftReportCard(): React.ReactElement | null {
  const { loading, error, context, recent, submit } = useShiftReports();
  const [modalOpen, setModalOpen] = useState(false);

  // Nothing to show until we know the worker is on an open shift.
  if (loading || !context?.onShift) return null;

  const patients = context.patients ?? [];

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 mt-6">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Care reporting</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {context.location?.name ?? 'Your shift'}
            {context.shift?.pattern && ` · ${context.shift.pattern.name}`}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 cursor-pointer"
        >
          New report
        </button>
      </div>

      <ErrorAlert message={error} className="my-3" />

      {recent.length === 0 ? (
        <p className="text-xs text-slate-400 mt-3">
          No reports filed for this shift yet. Use “New report” to log care notes, incidents or
          concerns.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-50">
          {recent.map((r) => {
            const badge = PRIORITY_BADGE[r.priority];
            const name = r.patient ? `${r.patient.givenName} ${r.patient.familyName}` : 'Patient';
            return (
              <li key={r.id} className="py-2.5">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-slate-900">{name}</span>
                  <span className="text-xs text-slate-400">
                    {CATEGORY_LABELS[r.category] ?? r.category}
                  </span>
                  {r.priority !== 'NORMAL' && (
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-slate-400">
                    {new Date(r.recordedAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{r.content}</p>
              </li>
            );
          })}
        </ul>
      )}

      {modalOpen && (
        <ReportModal patients={patients} onSubmit={submit} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
