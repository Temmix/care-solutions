import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api-client';
import { useAuth } from '../../../hooks/use-auth';

interface Props {
  patientId: string;
  patientName: string;
  /** Called after a successful anonymisation so the parent can refresh. */
  onAnonymised?: () => void;
}

/**
 * Admin-only patient data-protection actions: export all of a patient's data
 * (DSAR / right of access) and irreversibly anonymise it (right to erasure).
 * Renders nothing for non-admin users.
 */
export function PatientDataProtectionActions({
  patientId,
  patientName,
  onAnonymised,
}: Props): React.ReactElement | null {
  const { currentRole, isSuperAdmin, isTenantAdmin } = useAuth();
  const canManage = isSuperAdmin || isTenantAdmin || currentRole === 'ADMIN';
  // Anonymisation (erasure) is restricted to tenant admins server-side.
  const canErase = isSuperAdmin || isTenantAdmin || currentRole === 'TENANT_ADMIN';

  const [exporting, setExporting] = useState(false);
  const [showErase, setShowErase] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [reason, setReason] = useState('');
  const [erasing, setErasing] = useState(false);

  if (!canManage) return null;

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const data = await api.get<unknown>(`/privacy/patients/${patientId}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `patient-${patientId}-export.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Patient data exported');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const eraseValid = confirmation === patientId && reason.trim().length > 0;

  const handleErase = async (): Promise<void> => {
    if (!eraseValid) return;
    setErasing(true);
    try {
      await api.post(`/privacy/patients/${patientId}/anonymise`, {
        confirmation,
        reason: reason.trim(),
      });
      toast.success('Patient record anonymised');
      setShowErase(false);
      setConfirmation('');
      setReason('');
      onAnonymised?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Anonymisation failed');
    } finally {
      setErasing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium cursor-pointer hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        {exporting ? 'Exporting…' : 'Export data'}
      </button>

      {canErase && (
        <button
          onClick={() => setShowErase(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-medium cursor-pointer hover:bg-red-50 transition-colors"
        >
          Erase data
        </button>
      )}

      {showErase && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Erase patient data</h2>
            <p className="text-sm text-slate-600 mb-4">
              This irreversibly anonymises <span className="font-medium">{patientName}</span> —
              identifiers are removed and clinical notes are blanked. The de-identified clinical
              record is retained. This cannot be undone.
            </p>

            <label className="block text-xs font-medium text-slate-600 mb-1">
              Type the patient ID to confirm
            </label>
            <p className="font-mono text-xs text-slate-400 mb-1 break-all">{patientId}</p>
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent mb-3"
              placeholder="Patient ID"
            />

            <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent mb-5"
              placeholder="e.g. Data subject erasure request"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowErase(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm cursor-pointer hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleErase}
                disabled={!eraseValid || erasing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {erasing ? 'Erasing…' : 'Confirm erasure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
