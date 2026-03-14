import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useMedications,
  type FhirMedicationRequest,
  type FhirMedicationAdministration,
} from './hooks/use-medications';
import { PrescriptionStatusBadge } from './components/PrescriptionStatusBadge';

const STATUS_TRANSITIONS: Record<string, { label: string; value: string }[]> = {
  draft: [{ label: 'Activate', value: 'ACTIVE' }],
  active: [
    { label: 'Complete', value: 'COMPLETED' },
    { label: 'Put on Hold', value: 'ON_HOLD' },
    { label: 'Stop', value: 'STOPPED' },
  ],
  'on-hold': [
    { label: 'Resume', value: 'ACTIVE' },
    { label: 'Cancel', value: 'CANCELLED' },
  ],
  completed: [],
  stopped: [],
  cancelled: [],
};

export function MedicationsDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { getPrescription, updatePrescription, recordAdministration } = useMedications();
  const [prescription, setPrescription] = useState<FhirMedicationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'administrations'>('details');
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminDose, setAdminDose] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [adminStatus, setAdminStatus] = useState('COMPLETED');
  const [adminNotGivenReason, setAdminNotGivenReason] = useState('');

  useEffect(() => {
    if (!id) return;
    getPrescription(id)
      .then(setPrescription)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id, getPrescription]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      const updated = await updatePrescription(id, { status: newStatus });
      setPrescription(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const refresh = async () => {
    if (!id) return;
    const updated = await getPrescription(id);
    setPrescription(updated);
  };

  const handleRecordAdmin = async () => {
    if (!id) return;
    try {
      const data: Record<string, unknown> = {
        requestId: id,
        status: adminStatus,
      };
      if (adminDose.trim()) data.doseGiven = adminDose.trim();
      if (adminNotes.trim()) data.notes = adminNotes.trim();
      if (adminStatus === 'NOT_DONE' && adminNotGivenReason.trim()) {
        data.notGivenReason = adminNotGivenReason.trim();
      }
      await recordAdministration(data);
      setAdminDose('');
      setAdminNotes('');
      setAdminStatus('COMPLETED');
      setAdminNotGivenReason('');
      setShowAdminForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record administration');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400 text-sm">Loading prescription...</div>
      </div>
    );
  }

  if (error && !prescription) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (!prescription) {
    return <div className="text-slate-500 text-center py-20">Prescription not found</div>;
  }

  const transitions = STATUS_TRANSITIONS[prescription.status] ?? [];
  const dosage = prescription.dosageInstruction?.[0];
  const period = prescription.dispenseRequest?.validityPeriod;
  const administrations =
    (prescription as FhirMedicationRequest & { contained?: FhirMedicationAdministration[] })
      .contained ?? [];

  return (
    <div>
      {/* Breadcrumb + header */}
      <div className="mb-6">
        <Link
          to="/medications"
          className="inline-flex items-center gap-1 text-slate-400 no-underline text-sm hover:text-slate-600 transition-colors mb-3"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to Medications
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {prescription.medicationReference?.display ?? 'Prescription'}
            </h1>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <PrescriptionStatusBadge status={prescription.status} />
              {prescription.priority && (
                <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full">
                  {prescription.priority.charAt(0).toUpperCase() + prescription.priority.slice(1)}
                </span>
              )}
              <span>Patient: {prescription.subject?.display ?? '-'}</span>
            </div>
          </div>
          {transitions.length > 0 && (
            <div className="flex gap-2">
              {transitions.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleStatusChange(t.value)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors border-none ${
                    t.value === 'ACTIVE'
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : t.value === 'COMPLETED'
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-red-50 hover:bg-red-100 text-red-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Info bar */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <div className="text-xs font-medium text-slate-400 mb-0.5">Prescriber</div>
            <div className="text-slate-900">{prescription.requester?.display ?? '-'}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 mb-0.5">Route</div>
            <div className="text-slate-900">
              {dosage?.route?.text
                ? dosage.route.text.charAt(0) + dosage.route.text.slice(1).toLowerCase()
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 mb-0.5">Frequency</div>
            <div className="text-slate-900">{dosage?.timing?.code?.text ?? '-'}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 mb-0.5">Start Date</div>
            <div className="text-slate-900">
              {period?.start ? new Date(period.start).toLocaleDateString() : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 mb-0.5">End Date</div>
            <div className="text-slate-900">
              {period?.end ? new Date(period.end).toLocaleDateString() : '-'}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-xs font-medium text-slate-400 mb-1">Dosage Instructions</div>
          <p className="text-sm text-slate-600 m-0">{dosage?.text ?? '-'}</p>
        </div>
        {prescription.reasonCode?.[0]?.text && (
          <div className="mt-3">
            <div className="text-xs font-medium text-slate-400 mb-1">Reason</div>
            <p className="text-sm text-slate-600 m-0">{prescription.reasonCode[0].text}</p>
          </div>
        )}
        {prescription.note && (
          <div className="mt-3">
            <div className="text-xs font-medium text-slate-400 mb-1">Special Instructions</div>
            <p className="text-sm text-slate-600 m-0">{prescription.note}</p>
          </div>
        )}
        {dosage?.asNeededBoolean && (
          <div className="mt-3">
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              PRN (As Needed)
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-100">
        <div className="flex border-b border-slate-100">
          {(['details', 'administrations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium border-none bg-transparent cursor-pointer transition-colors ${
                activeTab === tab
                  ? 'text-accent border-b-2 border-accent -mb-px'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'details' ? 'Details' : `Administrations (${administrations.length})`}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'details' && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs font-medium text-slate-400 mb-0.5">Max Dose Per Day</div>
                <div className="text-slate-900">
                  {dosage?.maxDosePerPeriod?.numerator?.unit ?? 'Not specified'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400 mb-0.5">Last Updated</div>
                <div className="text-slate-900">
                  {prescription.meta?.lastUpdated
                    ? new Date(prescription.meta.lastUpdated).toLocaleDateString()
                    : '-'}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'administrations' && (
            <div className="space-y-3">
              {administrations.length === 0 && !showAdminForm && (
                <p className="text-slate-400 text-sm text-center py-6 m-0">
                  No administrations recorded
                </p>
              )}

              {administrations.map((admin) => (
                <div
                  key={admin.id}
                  className="border border-slate-100 rounded-lg p-4 flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <PrescriptionStatusBadge status={admin.status} />
                      <span className="text-xs text-slate-400">
                        {admin.effectiveDateTime
                          ? new Date(admin.effectiveDateTime).toLocaleString()
                          : '-'}
                      </span>
                    </div>
                    {admin.dosage?.text && (
                      <div className="text-sm text-slate-700">Dose: {admin.dosage.text}</div>
                    )}
                    {admin.performer?.[0]?.actor?.display && (
                      <div className="text-xs text-slate-500 mt-1">
                        By: {admin.performer[0].actor.display}
                      </div>
                    )}
                    {admin.note && <div className="text-xs text-slate-500 mt-1">{admin.note}</div>}
                    {admin.statusReason?.[0]?.text && (
                      <div className="text-xs text-red-600 mt-1">
                        Not given: {admin.statusReason[0].text}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {prescription.status === 'active' && (
                <>
                  {showAdminForm ? (
                    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                      <div className="flex gap-3">
                        <select
                          value={adminStatus}
                          onChange={(e) => setAdminStatus(e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                        >
                          <option value="COMPLETED">Administered</option>
                          <option value="NOT_DONE">Not Given</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Dose given (e.g. 500mg)"
                          value={adminDose}
                          onChange={(e) => setAdminDose(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                      {adminStatus === 'NOT_DONE' && (
                        <input
                          type="text"
                          placeholder="Reason not given"
                          value={adminNotGivenReason}
                          onChange={(e) => setAdminNotGivenReason(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        />
                      )}
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setShowAdminForm(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleRecordAdmin}
                          className="px-3 py-1.5 text-xs text-white bg-accent rounded-lg cursor-pointer hover:bg-accent-dark border-none"
                        >
                          Record
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAdminForm(true)}
                      className="w-full py-2 text-xs text-accent bg-transparent border border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
                    >
                      + Record Administration
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
