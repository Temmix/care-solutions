import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useIot, type IotDevice } from './hooks/use-iot';
import { DeviceStatusBadge } from './components/DeviceStatusBadge';

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

export function DevicesListPage(): React.ReactElement {
  const { listDevices, registerDevice, loading, error } = useIot();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  // Register form state
  const [regSerial, setRegSerial] = useState('');
  const [regType, setRegType] = useState('PULSE_OXIMETER');
  const [regManufacturer, setRegManufacturer] = useState('');
  const [regModel, setRegModel] = useState('');
  const [registering, setRegistering] = useState(false);

  const load = useCallback(() => {
    listDevices({ status: statusFilter || undefined, page, limit: 20 })
      .then((r) => {
        setDevices(r.data);
        setTotal(r.total);
      })
      .catch(() => {});
  }, [listDevices, statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRegister = async () => {
    if (!regSerial.trim()) return;
    setRegistering(true);
    try {
      const device = await registerDevice({
        serialNumber: regSerial.trim(),
        deviceType: regType,
        manufacturer: regManufacturer || undefined,
        model: regModel || undefined,
      });
      setShowRegister(false);
      setRegSerial('');
      setRegManufacturer('');
      setRegModel('');
      navigate(`/app/iot/devices/${device.id}`);
    } catch {
      // error state handled by hook
    } finally {
      setRegistering(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">IoT Devices</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage connected medical devices for virtual ward monitoring.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/app/iot/api-keys"
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            API Keys
          </Link>
          <button
            onClick={() => setShowRegister(true)}
            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90"
          >
            Register Device
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

      {/* Filters */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="REGISTERED">Registered</option>
          <option value="ACTIVE">Active</option>
          <option value="OFFLINE">Offline</option>
          <option value="DECOMMISSIONED">Decommissioned</option>
        </select>
      </div>

      {/* Device table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Serial Number</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Type</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Battery</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Last Seen</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium">Assignment</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => {
              const activeAssignment = d.assignments?.find((a) => a.isActive);
              return (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-4">
                    <Link
                      to={`/app/iot/devices/${d.id}`}
                      className="text-accent hover:underline font-medium"
                    >
                      {d.serialNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {DEVICE_TYPE_LABELS[d.deviceType] ?? d.deviceType}
                  </td>
                  <td className="py-3 px-4">
                    <DeviceStatusBadge
                      status={d.status}
                      isOnline={d.isOnline}
                      lastSeenAt={d.lastSeenAt}
                    />
                  </td>
                  <td className="py-3 px-4">
                    {d.batteryLevel != null ? (
                      <span
                        className={`text-sm font-medium ${
                          d.batteryLevel < 20
                            ? 'text-red-500'
                            : d.batteryLevel < 50
                              ? 'text-amber-500'
                              : 'text-green-600'
                        }`}
                      >
                        {d.batteryLevel}%
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {d.lastSeenAt
                      ? new Date(d.lastSeenAt).toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {activeAssignment
                      ? `${activeAssignment.enrolment.patient.givenName} ${activeAssignment.enrolment.patient.familyName}`
                      : '—'}
                  </td>
                </tr>
              );
            })}
            {!loading && devices.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No devices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
          <span>
            Page {page} of {totalPages} ({total} devices)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded border border-slate-200 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded border border-slate-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Register Device</h2>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={regSerial}
                  onChange={(e) => setRegSerial(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Device Type</label>
                <select
                  value={regType}
                  onChange={(e) => setRegType(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  {Object.entries(DEVICE_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Manufacturer (optional)
                </label>
                <input
                  type="text"
                  value={regManufacturer}
                  onChange={(e) => setRegManufacturer(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Model (optional)
                </label>
                <input
                  type="text"
                  value={regModel}
                  onChange={(e) => setRegModel(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRegister(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRegister}
                disabled={!regSerial.trim() || registering}
                className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
              >
                {registering ? 'Registering...' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
