import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePatientFlow, type Encounter, type Location } from './hooks/use-patient-flow';
import { useAuth } from '../../hooks/use-auth';
import { useWebSocket } from '../../hooks/use-websocket';
import { ErrorAlert } from '../../components/ErrorAlert';

const statusColors: Record<string, string> = {
  PLANNED: 'bg-slate-50 text-slate-600',
  ARRIVED: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-emerald-50 text-emerald-700',
  ON_LEAVE: 'bg-amber-50 text-amber-700',
  FINISHED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-600',
};

const bedStatusColors: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500',
  OCCUPIED: 'bg-red-500',
  MAINTENANCE: 'bg-amber-500',
  CLOSED: 'bg-slate-400',
};

export function PatientFlowDashboardPage(): React.ReactElement {
  const { isSuperAdmin, selectedTenant } = useAuth();
  const { listEncounters, listLocations, loading, error } = usePatientFlow();
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [totalEncounters, setTotalEncounters] = useState(0);

  const reload = useCallback(async () => {
    if (isSuperAdmin && !selectedTenant) return;
    try {
      const [encResult, locs] = await Promise.all([
        listEncounters({ status: 'IN_PROGRESS', limit: 10 }),
        listLocations(),
      ]);
      setEncounters(encResult.data);
      setTotalEncounters(encResult.total);
      setLocations(locs);
    } catch {
      // error
    }
  }, [isSuperAdmin, selectedTenant, listEncounters, listLocations]);

  useEffect(() => {
    reload();
  }, [reload]);

  useWebSocket({
    'bed:status-changed': (data: unknown) => {
      const evt = data as { bedId: string; status: string };
      toast(`Bed updated: ${evt.bedId} → ${evt.status}`, { icon: '🛏️' });
      reload();
    },
  });

  // Compute bed stats
  const allBeds = locations.flatMap((l) => l.beds);
  const bedStats = {
    total: allBeds.length,
    available: allBeds.filter((b) => b.status === 'AVAILABLE').length,
    occupied: allBeds.filter((b) => b.status === 'OCCUPIED').length,
    maintenance: allBeds.filter((b) => b.status === 'MAINTENANCE').length,
  };
  const occupancyPct =
    bedStats.total > 0 ? Math.round((bedStats.occupied / bedStats.total) * 100) : 0;

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 text-center py-20">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Select a Tenant First</h2>
        <p className="text-slate-500 text-sm mb-6">Select a tenant to view patient flow.</p>
        <Link
          to="/app/tenants"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-white no-underline rounded-lg text-sm font-medium transition-colors"
        >
          Select a Tenant
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Patient Flow</h1>
          <p className="text-slate-500 text-sm">Overview of bed occupancy and active encounters</p>
        </div>
        <Link
          to="/app/admit"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white no-underline rounded-lg text-sm font-medium transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Admit Patient
        </Link>
      </div>

      <ErrorAlert message={error} className="mb-4" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <div className="text-sm text-slate-500 mb-1">Active Encounters</div>
          <div className="text-3xl font-bold text-slate-900">{totalEncounters}</div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <div className="text-sm text-slate-500 mb-1">Available Beds</div>
          <div className="text-3xl font-bold text-emerald-600">{bedStats.available}</div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <div className="text-sm text-slate-500 mb-1">Occupied Beds</div>
          <div className="text-3xl font-bold text-red-600">{bedStats.occupied}</div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <div className="text-sm text-slate-500 mb-1">Occupancy Rate</div>
          <div className="text-3xl font-bold text-slate-900">{occupancyPct}%</div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bed overview by location */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-100">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-900">Bed Overview</h2>
            <Link
              to="/app/locations"
              className="text-xs text-accent font-medium no-underline hover:underline"
            >
              Manage Locations
            </Link>
          </div>
          <div className="p-6 space-y-4">
            {locations
              .filter((l) => l.beds.length > 0)
              .map((loc) => {
                const avail = loc.beds.filter((b) => b.status === 'AVAILABLE').length;
                return (
                  <div key={loc.id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-600 font-medium">{loc.name}</span>
                      <span className="text-slate-400">
                        {avail} available / {loc.beds.length} total
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {loc.beds.map((bed) => (
                        <div
                          key={bed.id}
                          title={`${bed.identifier}: ${bed.status}`}
                          className={`w-6 h-6 rounded ${bedStatusColors[bed.status] ?? 'bg-slate-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            {locations.filter((l) => l.beds.length > 0).length === 0 && (
              <div className="text-sm text-slate-400 text-center py-4">No beds configured yet</div>
            )}
          </div>
        </div>

        {/* Active encounters */}
        <div className="bg-white rounded-xl border border-slate-100">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Active Encounters</h2>
          </div>
          {encounters.length === 0 && !loading && (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">
              No active encounters
            </div>
          )}
          <div className="divide-y divide-slate-50">
            {encounters.map((enc) => (
              <Link
                key={enc.id}
                to={`/app/encounters/${enc.id}`}
                className="flex items-center justify-between px-6 py-3.5 no-underline hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {enc.patient.givenName} {enc.patient.familyName}
                  </div>
                  <div className="text-xs text-slate-400">
                    {enc.location?.name ?? '—'}
                    {enc.bed ? ` / ${enc.bed.identifier}` : ''}
                    {' · '}
                    {enc.class.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[enc.status] ?? statusColors.PLANNED}`}
                  >
                    {enc.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(enc.admissionDate).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>}
    </div>
  );
}
