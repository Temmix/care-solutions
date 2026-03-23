import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useIot, type IotDevice } from './hooks/use-iot';
import { DeviceStatusBadge } from './components/DeviceStatusBadge';
import { AssignDeviceModal } from './components/AssignDeviceModal';

const DEVICE_TYPE_LABELS: Record<string, string> = {
  PULSE_OXIMETER: 'Pulse Oximeter',
  BLOOD_PRESSURE_MONITOR: 'BP Monitor',
  THERMOMETER: 'Thermometer',
  GLUCOMETER: 'Glucometer',
  WEIGHT_SCALE: 'Weight Scale',
  WEARABLE: 'Wearable',
  SPIROMETER: 'Spirometer',
  ECG_MONITOR: 'ECG Monitor',
  OTHER: 'Other',
};

export function DeviceDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { getDevice, assignDevice, unassignDevice, decommissionDevice, loading, error } = useIot();
  const [device, setDevice] = useState<IotDevice | null>(null);
  const [showAssign, setShowAssign] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    getDevice(id)
      .then(setDevice)
      .catch(() => {});
  }, [id, getDevice]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !device) {
    return <p className="text-sm text-slate-400">Loading...</p>;
  }

  if (!device) {
    return <p className="text-sm text-red-500">{error ?? 'Device not found'}</p>;
  }

  const activeAssignment = device.assignments?.find((a) => a.isActive);

  const handleAssign = async (enrolmentId: string) => {
    await assignDevice(device.id, enrolmentId);
    load();
  };

  const handleUnassign = async () => {
    await unassignDevice(device.id);
    load();
  };

  const handleDecommission = async () => {
    if (!confirm('Are you sure you want to decommission this device?')) return;
    await decommissionDevice(device.id);
    load();
  };

  return (
    <div>
      <div className="mb-6">
        <Link to="/app/iot/devices" className="text-sm text-accent hover:underline">
          &larr; Back to Devices
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{device.serialNumber}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {DEVICE_TYPE_LABELS[device.deviceType] ?? device.deviceType}
              {device.manufacturer && ` — ${device.manufacturer}`}
              {device.model && ` ${device.model}`}
            </p>
          </div>
          <DeviceStatusBadge
            status={device.status}
            isOnline={device.isOnline}
            lastSeenAt={device.lastSeenAt}
          />
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

      <div className="grid grid-cols-2 gap-6">
        {/* Info card */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Device Info</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Firmware</dt>
              <dd className="text-slate-900">{device.firmwareVersion ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Battery</dt>
              <dd
                className={
                  device.batteryLevel != null && device.batteryLevel < 20
                    ? 'text-red-500 font-medium'
                    : 'text-slate-900'
                }
              >
                {device.batteryLevel != null ? `${device.batteryLevel}%` : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Last Seen</dt>
              <dd className="text-slate-900">
                {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString('en-GB') : 'Never'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Registered</dt>
              <dd className="text-slate-900">
                {new Date(device.createdAt).toLocaleDateString('en-GB')}
              </dd>
            </div>
          </dl>

          {device.status !== 'DECOMMISSIONED' && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
              {activeAssignment ? (
                <button
                  onClick={handleUnassign}
                  className="px-3 py-1.5 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Unassign
                </button>
              ) : (
                <button
                  onClick={() => setShowAssign(true)}
                  className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent/90"
                >
                  Assign to Enrolment
                </button>
              )}
              <button
                onClick={handleDecommission}
                className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
              >
                Decommission
              </button>
            </div>
          )}
        </div>

        {/* Current Assignment */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Current Assignment</h3>
          {activeAssignment ? (
            <div className="text-sm">
              <p className="text-slate-900 font-medium">
                {activeAssignment.enrolment.patient.givenName}{' '}
                {activeAssignment.enrolment.patient.familyName}
              </p>
              <p className="text-slate-500 mt-1">
                Assigned {new Date(activeAssignment.assignedAt).toLocaleDateString('en-GB')}
              </p>
              <Link
                to={`/app/virtual-wards/${activeAssignment.enrolment.id}`}
                className="text-accent hover:underline text-sm mt-2 inline-block"
              >
                View Enrolment &rarr;
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No active assignment</p>
          )}
        </div>
      </div>

      {/* Assignment History */}
      {device.assignments && device.assignments.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Assignment History</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-slate-500 font-medium">Patient</th>
                <th className="text-left py-2 text-slate-500 font-medium">Assigned</th>
                <th className="text-left py-2 text-slate-500 font-medium">Unassigned</th>
                <th className="text-left py-2 text-slate-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {device.assignments.map((a) => (
                <tr key={a.id} className="border-b border-slate-50">
                  <td className="py-2 text-slate-700">
                    {a.enrolment.patient.givenName} {a.enrolment.patient.familyName}
                  </td>
                  <td className="py-2 text-slate-600">
                    {new Date(a.assignedAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="py-2 text-slate-600">
                    {a.unassignedAt ? new Date(a.unassignedAt).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="py-2">
                    {a.isActive ? (
                      <span className="text-green-600 font-medium">Active</span>
                    ) : (
                      <span className="text-slate-400">Ended</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Readings */}
      {device.observations && device.observations.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-slate-100 p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">Recent Readings</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-slate-500 font-medium">Vital</th>
                <th className="text-left py-2 text-slate-500 font-medium">Value</th>
                <th className="text-left py-2 text-slate-500 font-medium">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {device.observations.map((o) => (
                <tr key={o.id} className="border-b border-slate-50">
                  <td className="py-2 text-slate-700">{o.vitalType.replace(/_/g, ' ')}</td>
                  <td className="py-2 text-slate-900 font-medium">
                    {o.value} {o.unit}
                  </td>
                  <td className="py-2 text-slate-600">
                    {new Date(o.recordedAt).toLocaleString('en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AssignDeviceModal
        open={showAssign}
        onClose={() => setShowAssign(false)}
        onAssign={handleAssign}
      />
    </div>
  );
}
