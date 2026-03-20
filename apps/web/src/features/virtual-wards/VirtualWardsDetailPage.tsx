import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useVirtualWards, type VwEnrolment } from './hooks/use-virtual-wards';
import { ErrorAlert } from '../../components/ErrorAlert';

const TABS = ['Overview', 'Protocols', 'Observations', 'Alerts'] as const;
type Tab = (typeof TABS)[number];

const VITAL_TYPES = [
  'HEART_RATE',
  'BLOOD_PRESSURE_SYSTOLIC',
  'BLOOD_PRESSURE_DIASTOLIC',
  'RESPIRATORY_RATE',
  'OXYGEN_SATURATION',
  'TEMPERATURE',
  'BLOOD_GLUCOSE',
  'WEIGHT',
  'OTHER',
] as const;

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const statusColors: Record<string, string> = {
  ENROLLED: 'bg-blue-50 text-blue-700',
  MONITORING: 'bg-emerald-50 text-emerald-700',
  ESCALATED: 'bg-red-50 text-red-600',
  PAUSED: 'bg-amber-50 text-amber-700',
  DISCHARGED: 'bg-slate-100 text-slate-600',
};

const severityColors: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const alertStatusColors: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-700',
  ACKNOWLEDGED: 'bg-amber-50 text-amber-700',
  ESCALATED: 'bg-orange-50 text-orange-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
};

function formatDate(d: string | undefined | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(d: string | undefined | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function VirtualWardsDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const {
    getEnrolment,
    createProtocol,
    deleteProtocol,
    recordObservation,
    acknowledgeAlert,
    resolveAlert,
    discharge,
    loading,
    error,
  } = useVirtualWards();

  const [enrolment, setEnrolment] = useState<VwEnrolment | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadEnrolment = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getEnrolment(id);
      setEnrolment(data);
    } catch {
      // error handled by hook
    }
  }, [id, getEnrolment]);

  useEffect(() => {
    loadEnrolment();
  }, [loadEnrolment]);

  // ── Protocol form state ─────────────────────────────────
  const [protVitalType, setProtVitalType] = useState('');
  const [protFrequency, setProtFrequency] = useState('4');
  const [protThreshMin, setProtThreshMin] = useState('');
  const [protThreshMax, setProtThreshMax] = useState('');
  const [protThreshSev, setProtThreshSev] = useState('HIGH');

  async function handleCreateProtocol(): Promise<void> {
    if (!id || !protVitalType) return;
    setActionLoading(true);
    setActionError('');
    try {
      const thresholds = [];
      if (protThreshMin || protThreshMax) {
        thresholds.push({
          minValue: protThreshMin ? parseFloat(protThreshMin) : undefined,
          maxValue: protThreshMax ? parseFloat(protThreshMax) : undefined,
          severity: protThreshSev,
        });
      }
      await createProtocol(id, {
        vitalType: protVitalType,
        frequencyHours: parseInt(protFrequency, 10),
        thresholds,
      });
      await loadEnrolment();
      setProtVitalType('');
      setProtThreshMin('');
      setProtThreshMax('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteProtocol(protocolId: string): Promise<void> {
    if (!id) return;
    setActionLoading(true);
    try {
      await deleteProtocol(id, protocolId);
      await loadEnrolment();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Observation form state ──────────────────────────────
  const [obsVitalType, setObsVitalType] = useState('');
  const [obsValue, setObsValue] = useState('');
  const [obsUnit, setObsUnit] = useState('');
  const [obsNotes, setObsNotes] = useState('');

  async function handleRecordObservation(): Promise<void> {
    if (!id || !obsVitalType || !obsValue || !obsUnit) return;
    setActionLoading(true);
    setActionError('');
    try {
      await recordObservation(id, {
        vitalType: obsVitalType,
        value: parseFloat(obsValue),
        unit: obsUnit,
        notes: obsNotes || undefined,
      });
      await loadEnrolment();
      setObsValue('');
      setObsNotes('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Alert actions ───────────────────────────────────────
  async function handleAcknowledge(alertId: string): Promise<void> {
    if (!id) return;
    setActionLoading(true);
    try {
      await acknowledgeAlert(id, alertId);
      await loadEnrolment();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResolve(alertId: string): Promise<void> {
    if (!id) return;
    setActionLoading(true);
    try {
      await resolveAlert(id, alertId);
      await loadEnrolment();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Discharge ───────────────────────────────────────────
  const [dischargeReason, setDischargeReason] = useState('');

  async function handleDischarge(): Promise<void> {
    if (!id || !dischargeReason) return;
    setActionLoading(true);
    setActionError('');
    try {
      await discharge(id, { dischargeReason });
      await loadEnrolment();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && !enrolment) {
    return <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>;
  }

  if (!enrolment) {
    return (
      <div className="text-center py-12">
        <ErrorAlert message={error || 'Enrolment not found'} />
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/app/virtual-wards"
        className="text-sm text-slate-500 hover:text-accent mb-4 inline-block"
      >
        &larr; Back to Virtual Wards
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {enrolment.patient.givenName} {enrolment.patient.familyName}
          </h1>
          <span
            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[enrolment.status] ?? 'bg-slate-100 text-slate-600'}`}
          >
            {enrolment.status}
          </span>
        </div>
        {enrolment.status !== 'DISCHARGED' && (
          <div className="flex items-center gap-2">
            <input
              value={dischargeReason}
              onChange={(e) => setDischargeReason(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              placeholder="Discharge reason"
            />
            <button
              onClick={handleDischarge}
              disabled={actionLoading || !dischargeReason}
              className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 cursor-pointer disabled:opacity-50"
            >
              Discharge
            </button>
          </div>
        )}
      </div>

      <ErrorAlert message={error || actionError} className="mb-4" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px cursor-pointer ${
              tab === t
                ? 'border-accent text-accent'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-6">
        {/* ── Overview ─────────────────────────────── */}
        {tab === 'Overview' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-slate-500 mb-1">Enrolment Date</div>
              <div className="text-sm font-medium">{formatDate(enrolment.enrolmentDate)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Enrolled By</div>
              <div className="text-sm">
                {enrolment.enroller.firstName} {enrolment.enroller.lastName}
              </div>
            </div>
            {enrolment.clinicalSummary && (
              <div className="col-span-2 md:col-span-3">
                <div className="text-xs text-slate-500 mb-1">Clinical Summary</div>
                <div className="text-sm">{enrolment.clinicalSummary}</div>
              </div>
            )}
            {enrolment.dischargeDate && (
              <>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Discharge Date</div>
                  <div className="text-sm">{formatDate(enrolment.dischargeDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Discharge Reason</div>
                  <div className="text-sm">{enrolment.dischargeReason}</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Protocols ────────────────────────────── */}
        {tab === 'Protocols' && (
          <div>
            {(enrolment.protocols ?? []).length > 0 && (
              <div className="space-y-3 mb-6">
                {enrolment.protocols!.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border border-slate-200 rounded-lg p-4"
                  >
                    <div>
                      <div className="text-sm font-medium">{p.vitalType.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-slate-500">
                        Every {p.frequencyHours}h &middot; {p.isActive ? 'Active' : 'Inactive'}{' '}
                        &middot; {p.thresholds.length} threshold
                        {p.thresholds.length !== 1 ? 's' : ''}
                      </div>
                      {p.thresholds.map((t, i) => (
                        <div key={i} className="text-xs text-slate-400 mt-1">
                          {t.minValue != null ? `Min: ${t.minValue}` : ''}
                          {t.minValue != null && t.maxValue != null ? ' / ' : ''}
                          {t.maxValue != null ? `Max: ${t.maxValue}` : ''} ({t.severity})
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => handleDeleteProtocol(p.id)}
                      className="text-red-500 text-xs hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Add Protocol</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select
                  value={protVitalType}
                  onChange={(e) => setProtVitalType(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Vital type</option>
                  {VITAL_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                <input
                  value={protFrequency}
                  onChange={(e) => setProtFrequency(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Frequency (hours)"
                  type="number"
                />
                <input
                  value={protThreshMin}
                  onChange={(e) => setProtThreshMin(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Min threshold"
                  type="number"
                />
                <input
                  value={protThreshMax}
                  onChange={(e) => setProtThreshMax(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Max threshold"
                  type="number"
                />
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={protThreshSev}
                  onChange={(e) => setProtThreshSev(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCreateProtocol}
                  disabled={actionLoading || !protVitalType}
                  className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Adding...' : 'Add Protocol'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Observations ─────────────────────────── */}
        {tab === 'Observations' && (
          <div>
            {/* Record form */}
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Record Observation</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select
                  value={obsVitalType}
                  onChange={(e) => setObsVitalType(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Vital type</option>
                  {VITAL_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                <input
                  value={obsValue}
                  onChange={(e) => setObsValue(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Value"
                  type="number"
                />
                <input
                  value={obsUnit}
                  onChange={(e) => setObsUnit(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Unit (e.g. bpm, mmHg)"
                />
                <input
                  value={obsNotes}
                  onChange={(e) => setObsNotes(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Notes (optional)"
                />
              </div>
              <button
                onClick={handleRecordObservation}
                disabled={actionLoading || !obsVitalType || !obsValue || !obsUnit}
                className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Recording...' : 'Record'}
              </button>
            </div>

            {/* Observations list */}
            {(enrolment.observations ?? []).length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left bg-slate-50">
                      <th className="px-3 py-2 font-medium text-slate-500">Type</th>
                      <th className="px-3 py-2 font-medium text-slate-500">Value</th>
                      <th className="px-3 py-2 font-medium text-slate-500">Unit</th>
                      <th className="px-3 py-2 font-medium text-slate-500">Recorded</th>
                      <th className="px-3 py-2 font-medium text-slate-500">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolment.observations!.map((o) => (
                      <tr key={o.id} className="border-b border-slate-50">
                        <td className="px-3 py-2">{o.vitalType.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2 font-medium">{o.value}</td>
                        <td className="px-3 py-2 text-slate-500">{o.unit}</td>
                        <td className="px-3 py-2 text-slate-500">{formatDateTime(o.recordedAt)}</td>
                        <td className="px-3 py-2 text-slate-500">
                          {o.recorder.firstName} {o.recorder.lastName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No observations recorded yet.</p>
            )}
          </div>
        )}

        {/* ── Alerts ───────────────────────────────── */}
        {tab === 'Alerts' && (
          <div>
            {(enrolment.alerts ?? []).length > 0 ? (
              <div className="space-y-3">
                {enrolment.alerts!.map((a) => (
                  <div key={a.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[a.severity] ?? ''}`}
                        >
                          {a.severity}
                        </span>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${alertStatusColors[a.status] ?? ''}`}
                        >
                          {a.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">{formatDateTime(a.createdAt)}</div>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{a.message}</p>
                    <div className="flex gap-2">
                      {a.status === 'OPEN' && (
                        <button
                          onClick={() => handleAcknowledge(a.id)}
                          disabled={actionLoading}
                          className="px-3 py-1 text-xs border border-amber-200 text-amber-700 rounded hover:bg-amber-50 cursor-pointer disabled:opacity-50"
                        >
                          Acknowledge
                        </button>
                      )}
                      {(a.status === 'OPEN' || a.status === 'ACKNOWLEDGED') && (
                        <button
                          onClick={() => handleResolve(a.id)}
                          disabled={actionLoading}
                          className="px-3 py-1 text-xs border border-emerald-200 text-emerald-700 rounded hover:bg-emerald-50 cursor-pointer disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No alerts.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
