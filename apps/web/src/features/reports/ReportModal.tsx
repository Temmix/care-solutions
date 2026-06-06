import { useState } from 'react';
import { ErrorAlert } from '../../components/ErrorAlert';
import {
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
  type NewShiftReport,
  type ShiftContextPatient,
  type ShiftReportCategory,
  type ShiftReportPriority,
} from './types';

export function ReportModal({
  patients,
  initialPatient,
  onSubmit,
  onClose,
}: {
  patients: ShiftContextPatient[];
  initialPatient?: ShiftContextPatient | null;
  onSubmit: (input: NewShiftReport) => Promise<void>;
  onClose: () => void;
}): React.ReactElement {
  const [patient, setPatient] = useState<ShiftContextPatient | null>(initialPatient ?? null);
  const [category, setCategory] = useState<ShiftReportCategory>('GENERAL_NOTE');
  const [priority, setPriority] = useState<ShiftReportPriority>('NORMAL');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!patient || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ patientId: patient.patientId, category, priority, content: content.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
        {!patient ? (
          <div className="p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              Who is this report about?
            </h2>
            {patients.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No patients at your location.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <button
                    key={p.patientId}
                    onClick={() => setPatient(p)}
                    className="w-full text-left py-3 cursor-pointer hover:bg-slate-50 px-2 -mx-2 rounded-lg"
                  >
                    <div className="text-sm font-medium text-slate-900">{p.name}</div>
                    {p.bed && <div className="text-xs text-slate-500">{p.bed}</div>}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Report · {patient.name}
              {patient.bed ? ` (${patient.bed})` : ''}
            </h2>

            <ErrorAlert message={error} className="mb-4" />

            <label className="block text-xs font-medium text-slate-600 mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                    category === c.value
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <label className="block text-xs font-medium text-slate-600 mb-1.5">Priority</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                    priority === p.value
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What happened during the shift…"
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 resize-y"
            />

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setPatient(null)}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={submit}
                disabled={!content.trim() || saving}
                className="flex-1 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
