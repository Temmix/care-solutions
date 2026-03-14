import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePatientFlow, type Encounter, type Location, type Bed } from './hooks/use-patient-flow';
import { useAuth } from '../../hooks/use-auth';
import { ErrorAlert } from '../../components/ErrorAlert';

const statusColors: Record<string, string> = {
  PLANNED: 'bg-slate-50 text-slate-600',
  ARRIVED: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-emerald-50 text-emerald-700',
  ON_LEAVE: 'bg-amber-50 text-amber-700',
  FINISHED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-600',
};

const dischargeDestinations = ['HOME', 'CARE_HOME', 'HOSPITAL_TRANSFER', 'DECEASED', 'OTHER'];

export function EncounterDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, selectedTenant } = useAuth();
  const {
    getEncounter,
    transferPatient,
    dischargePatient,
    listLocations,
    listBeds,
    loading,
    error,
  } = usePatientFlow();
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDischarge, setShowDischarge] = useState(false);
  const [toLocationId, setToLocationId] = useState('');
  const [toBedId, setToBedId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [dischargeDestination, setDischargeDestination] = useState('HOME');
  const [dischargeNotes, setDischargeNotes] = useState('');

  const load = async () => {
    if (!id) return;
    try {
      const [enc, locs] = await Promise.all([getEncounter(id), listLocations()]);
      setEncounter(enc);
      setLocations(locs);
    } catch {
      // error
    }
  };

  useEffect(() => {
    if (isSuperAdmin && !selectedTenant) return;
    load();
  }, [id, selectedTenant]); // eslint-disable-line

  useEffect(() => {
    if (!toLocationId) {
      setBeds([]);
      setToBedId('');
      return;
    }
    listBeds({ locationId: toLocationId, status: 'AVAILABLE' })
      .then(setBeds)
      .catch(() => {});
  }, [toLocationId]); // eslint-disable-line

  const handleTransfer = async () => {
    if (!id || !toLocationId) return;
    try {
      await transferPatient(id, {
        toLocationId,
        toBedId: toBedId || undefined,
        reason: transferReason || undefined,
      });
      setShowTransfer(false);
      setToLocationId('');
      setToBedId('');
      setTransferReason('');
      load();
    } catch {
      // error
    }
  };

  const handleDischarge = async () => {
    if (!id) return;
    try {
      await dischargePatient(id, {
        destination: dischargeDestination,
        notes: dischargeNotes || undefined,
      });
      setShowDischarge(false);
      load();
    } catch {
      // error
    }
  };

  if (loading && !encounter) {
    return <div className="text-center py-20 text-slate-400 text-sm">Loading encounter...</div>;
  }

  if (!encounter) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 text-center py-20">
        <div className="text-slate-400 text-sm">Encounter not found</div>
      </div>
    );
  }

  const isActive = ['PLANNED', 'ARRIVED', 'IN_PROGRESS'].includes(encounter.status);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Encounter — {encounter.patient.givenName} {encounter.patient.familyName}
          </h1>
          <p className="text-slate-500 text-sm">
            Admitted {new Date(encounter.admissionDate).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`text-sm px-3 py-1 rounded-full font-medium ${statusColors[encounter.status] ?? statusColors.PLANNED}`}
        >
          {encounter.status.replace(/_/g, ' ')}
        </span>
      </div>

      <ErrorAlert message={error} className="mb-4" />

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Encounter Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Patient</dt>
              <dd className="text-slate-900 font-medium">
                <Link
                  to={`/patients/${encounter.patient.id}`}
                  className="text-accent no-underline hover:underline"
                >
                  {encounter.patient.givenName} {encounter.patient.familyName}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Class</dt>
              <dd className="text-slate-900">{encounter.class.replace(/_/g, ' ')}</dd>
            </div>
            {encounter.admissionSource && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Admission Source</dt>
                <dd className="text-slate-900">{encounter.admissionSource.replace(/_/g, ' ')}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Location</dt>
              <dd className="text-slate-900">{encounter.location?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Bed</dt>
              <dd className="text-slate-900">{encounter.bed?.identifier ?? '—'}</dd>
            </div>
            {encounter.primaryPractitioner && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Primary Practitioner</dt>
                <dd className="text-slate-900">
                  {encounter.primaryPractitioner.firstName} {encounter.primaryPractitioner.lastName}
                </dd>
              </div>
            )}
            {encounter.dischargeDate && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Discharged</dt>
                <dd className="text-slate-900">
                  {new Date(encounter.dischargeDate).toLocaleDateString()}
                </dd>
              </div>
            )}
            {encounter.dischargeDestination && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Discharge Destination</dt>
                <dd className="text-slate-900">
                  {encounter.dischargeDestination.replace(/_/g, ' ')}
                </dd>
              </div>
            )}
            {encounter.notes && (
              <div>
                <dt className="text-slate-500 mb-1">Notes</dt>
                <dd className="text-slate-900 whitespace-pre-wrap">{encounter.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Transfers */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Transfer History</h2>
          {encounter.transfers && encounter.transfers.length > 0 ? (
            <div className="space-y-3">
              {encounter.transfers.map((t) => (
                <div key={t.id} className="p-3 rounded-lg bg-slate-50 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-900 font-medium">
                      {t.fromLocation?.name ?? '—'} &rarr; {t.toLocation.name}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {new Date(t.transferredAt).toLocaleString()}
                    </span>
                  </div>
                  {t.reason && <div className="text-slate-500 mt-1">{t.reason}</div>}
                  <div className="text-xs text-slate-400 mt-1">
                    by {t.transferredBy.firstName} {t.transferredBy.lastName}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400">No transfers recorded</div>
          )}
        </div>
      </div>

      {/* Actions */}
      {isActive && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowTransfer(!showTransfer)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors"
          >
            Transfer Patient
          </button>
          <button
            onClick={() => setShowDischarge(!showDischarge)}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors"
          >
            Discharge Patient
          </button>
        </div>
      )}

      {/* Transfer form */}
      {showTransfer && (
        <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Transfer Patient</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Destination Location</label>
              <select
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">Select location...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Bed</label>
              <select
                value={toBedId}
                onChange={(e) => setToBedId(e.target.value)}
                disabled={!toLocationId}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white disabled:opacity-50"
              >
                <option value="">Select bed...</option>
                {beds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.identifier}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Reason</label>
              <input
                type="text"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                placeholder="Reason for transfer..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleTransfer}
              disabled={!toLocationId}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 transition-colors"
            >
              Confirm Transfer
            </button>
            <button
              onClick={() => setShowTransfer(false)}
              className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm cursor-pointer hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Discharge form */}
      {showDischarge && (
        <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Discharge Patient</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Destination</label>
              <select
                value={dischargeDestination}
                onChange={(e) => setDischargeDestination(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
              >
                {dischargeDestinations.map((d) => (
                  <option key={d} value={d}>
                    {d.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Notes</label>
              <input
                type="text"
                value={dischargeNotes}
                onChange={(e) => setDischargeNotes(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                placeholder="Discharge notes..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleDischarge}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors"
            >
              Confirm Discharge
            </button>
            <button
              onClick={() => setShowDischarge(false)}
              className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm cursor-pointer hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => navigate('/patient-flow')}
        className="text-sm text-slate-500 bg-transparent border-none cursor-pointer hover:text-accent transition-colors"
      >
        &larr; Back to Patient Flow
      </button>
    </div>
  );
}
