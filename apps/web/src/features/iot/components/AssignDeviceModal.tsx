import { useState, useEffect } from 'react';
import { useVirtualWards, type VwEnrolment } from '../../virtual-wards/hooks/use-virtual-wards';

interface Props {
  open: boolean;
  onClose: () => void;
  onAssign: (enrolmentId: string) => Promise<void>;
}

export function AssignDeviceModal({ open, onClose, onAssign }: Props): React.ReactElement | null {
  const { searchEnrolments } = useVirtualWards();
  const [enrolments, setEnrolments] = useState<VwEnrolment[]>([]);
  const [selected, setSelected] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      searchEnrolments({ limit: 50 })
        .then((r) => setEnrolments(r.data.filter((e) => e.status !== 'DISCHARGED')))
        .catch(() => {});
    }
  }, [open, searchEnrolments]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await onAssign(selected);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Assign to Enrolment</h2>

        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
        >
          <option value="">Select an enrolment...</option>
          {enrolments.map((e) => (
            <option key={e.id} value={e.id}>
              {e.patient.givenName} {e.patient.familyName} — {e.status}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
          >
            {submitting ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}
