import { useState, useEffect, type FormEvent } from 'react';
import { useWorkforce, type ShiftPattern } from './hooks/use-workforce';
import { useAuth } from '../../hooks/use-auth';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../components/ErrorAlert';

const shiftTypeOptions = ['EARLY', 'LATE', 'NIGHT', 'LONG_DAY', 'TWILIGHT', 'CUSTOM'];

const shiftTypeColors: Record<string, string> = {
  EARLY: 'bg-amber-50 text-amber-700 border-amber-200',
  LATE: 'bg-blue-50 text-blue-700 border-blue-200',
  NIGHT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  LONG_DAY: 'bg-orange-50 text-orange-700 border-orange-200',
  TWILIGHT: 'bg-purple-50 text-purple-700 border-purple-200',
  CUSTOM: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function ShiftPatternsPage(): React.ReactElement {
  const { isSuperAdmin, selectedTenant } = useAuth();
  const { listShiftPatterns, createShiftPattern, deleteShiftPattern, loading, error } =
    useWorkforce();
  const [patterns, setPatterns] = useState<ShiftPattern[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [shiftType, setShiftType] = useState('EARLY');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('15:00');
  const [breakMinutes, setBreakMinutes] = useState(30);

  const load = async () => {
    try {
      const data = await listShiftPatterns();
      setPatterns(data);
    } catch {
      // error shown via hook
    }
  };

  useEffect(() => {
    if (isSuperAdmin && !selectedTenant) return;
    load();
  }, [selectedTenant]); // eslint-disable-line

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createShiftPattern({ name, shiftType, startTime, endTime, breakMinutes });
      setShowForm(false);
      setName('');
      load();
    } catch {
      // error shown via hook
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteShiftPattern(id);
      load();
    } catch {
      // error shown via hook
    }
  };

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 text-center py-20">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Select a Tenant First</h2>
        <p className="text-slate-500 text-sm mb-6">Select a tenant to manage shift patterns.</p>
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
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Shift Patterns</h1>
          <p className="text-slate-500 text-sm">Reusable shift templates for scheduling</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
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
          New Pattern
        </button>
      </div>

      <ErrorAlert message={error} className="mb-4" />

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-100 p-6 mb-6"
        >
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Create Shift Pattern</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="e.g. Early Shift"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Type</label>
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                {shiftTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Break (minutes)</label>
              <input
                type="number"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
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
              onClick={() => setShowForm(false)}
              className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm cursor-pointer hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="text-center py-12 text-slate-400 text-sm">Loading shift patterns...</div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {patterns.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{p.name}</h3>
                <span
                  className={`inline-block text-[0.65rem] px-2 py-0.5 rounded-full font-medium border mt-1 ${shiftTypeColors[p.shiftType] ?? shiftTypeColors.CUSTOM}`}
                >
                  {p.shiftType.replace(/_/g, ' ')}
                </span>
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                className="text-slate-400 hover:text-red-500 bg-transparent border-none cursor-pointer p-1 transition-colors"
                title="Delete pattern"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  />
                </svg>
              </button>
            </div>
            <div className="text-sm text-slate-500 space-y-1">
              <div>
                {p.startTime} — {p.endTime}
              </div>
              {p.breakMinutes > 0 && <div>{p.breakMinutes}min break</div>}
            </div>
          </div>
        ))}
      </div>

      {!loading && patterns.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 text-center py-16">
          <div className="text-slate-400 text-sm">
            No shift patterns yet. Create one to get started.
          </div>
        </div>
      )}
    </div>
  );
}
