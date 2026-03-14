import { useState, useEffect, type FormEvent } from 'react';
import { usePatientFlow, type Location } from './hooks/use-patient-flow';
import { useAuth } from '../../hooks/use-auth';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../components/ErrorAlert';

const locationTypes = ['WARD', 'ROOM', 'BED', 'DEPARTMENT', 'WING'];

const bedStatusColors: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  OCCUPIED: 'bg-red-100 text-red-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-slate-200 text-slate-500',
};

export function LocationsPage(): React.ReactElement {
  const { isSuperAdmin, selectedTenant } = useAuth();
  const { listLocations, createLocation, createBed, loading, error } = usePatientFlow();
  const [locations, setLocations] = useState<Location[]>([]);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [showBedForm, setShowBedForm] = useState<string | null>(null);
  const [locName, setLocName] = useState('');
  const [locType, setLocType] = useState('WARD');
  const [locWard, setLocWard] = useState('');
  const [locFloor, setLocFloor] = useState('');
  const [locCapacity, setLocCapacity] = useState(0);
  const [bedIdentifier, setBedIdentifier] = useState('');

  const load = async () => {
    try {
      const data = await listLocations();
      setLocations(data);
    } catch {
      // error
    }
  };

  useEffect(() => {
    if (isSuperAdmin && !selectedTenant) return;
    load();
  }, [selectedTenant]); // eslint-disable-line

  const handleCreateLocation = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createLocation({
        name: locName,
        type: locType,
        ward: locWard || undefined,
        floor: locFloor || undefined,
        capacity: locCapacity || undefined,
      });
      setShowLocationForm(false);
      setLocName('');
      load();
    } catch {
      // error
    }
  };

  const handleCreateBed = async (locationId: string) => {
    if (!bedIdentifier) return;
    try {
      await createBed({ identifier: bedIdentifier, locationId });
      setShowBedForm(null);
      setBedIdentifier('');
      load();
    } catch {
      // error
    }
  };

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 text-center py-20">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Select a Tenant First</h2>
        <p className="text-slate-500 text-sm mb-6">Select a tenant to manage locations.</p>
        <Link
          to="/tenants"
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
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Locations & Beds</h1>
          <p className="text-slate-500 text-sm">Manage wards, rooms, and bed allocations</p>
        </div>
        <button
          onClick={() => setShowLocationForm(!showLocationForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors"
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
          Add Location
        </button>
      </div>

      <ErrorAlert message={error} className="mb-4" />

      {showLocationForm && (
        <form
          onSubmit={handleCreateLocation}
          className="bg-white rounded-xl border border-slate-100 p-6 mb-6"
        >
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Create Location</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Name</label>
              <input
                type="text"
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="e.g. Ward A"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Type</label>
              <select
                value={locType}
                onChange={(e) => setLocType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                {locationTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Ward</label>
              <input
                type="text"
                value={locWard}
                onChange={(e) => setLocWard(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Floor</label>
              <input
                type="text"
                value={locFloor}
                onChange={(e) => setLocFloor(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Capacity</label>
              <input
                type="number"
                value={locCapacity}
                onChange={(e) => setLocCapacity(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              className="px-5 py-2 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowLocationForm(false)}
              className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm cursor-pointer hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="text-center py-12 text-slate-400 text-sm">Loading locations...</div>
      )}

      <div className="space-y-4">
        {locations
          .filter((l) => !l.parentId)
          .map((loc) => (
            <div key={loc.id} className="bg-white rounded-xl border border-slate-100 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{loc.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {loc.type.replace(/_/g, ' ')}
                    </span>
                    {loc.ward && <span className="text-xs text-slate-400">Ward: {loc.ward}</span>}
                    {loc.floor && (
                      <span className="text-xs text-slate-400">Floor: {loc.floor}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowBedForm(showBedForm === loc.id ? null : loc.id)}
                  className="text-xs text-accent bg-transparent border-none cursor-pointer hover:underline"
                >
                  + Add Bed
                </button>
              </div>

              {showBedForm === loc.id && (
                <div className="flex gap-3 items-end mb-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Bed Identifier</label>
                    <input
                      type="text"
                      value={bedIdentifier}
                      onChange={(e) => setBedIdentifier(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="e.g. Bed 1"
                    />
                  </div>
                  <button
                    onClick={() => handleCreateBed(loc.id)}
                    className="px-4 py-2 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}

              {loc.beds.length > 0 && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                  {loc.beds.map((bed) => (
                    <div
                      key={bed.id}
                      className={`p-3 rounded-lg text-center text-sm font-medium ${bedStatusColors[bed.status] ?? bedStatusColors.AVAILABLE}`}
                    >
                      <div>{bed.identifier}</div>
                      <div className="text-[0.65rem] mt-0.5 opacity-80">
                        {bed.status.replace(/_/g, ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {loc.beds.length === 0 && (
                <div className="text-sm text-slate-400">No beds configured</div>
              )}
            </div>
          ))}
      </div>

      {!loading && locations.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 text-center py-16">
          <div className="text-slate-400 text-sm">No locations yet. Create one to get started.</div>
        </div>
      )}
    </div>
  );
}
