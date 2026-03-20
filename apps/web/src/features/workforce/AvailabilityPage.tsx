import { useState, useEffect, type FormEvent } from 'react';
import { useWorkforce, type StaffAvailability } from './hooks/use-workforce';
import { useAuth } from '../../hooks/use-auth';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../../components/ErrorAlert';

const availabilityTypes = ['AVAILABLE', 'UNAVAILABLE', 'ANNUAL_LEAVE', 'SICK_LEAVE', 'TRAINING'];

const typeColors: Record<string, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700',
  UNAVAILABLE: 'bg-red-50 text-red-600',
  ANNUAL_LEAVE: 'bg-blue-50 text-blue-700',
  SICK_LEAVE: 'bg-orange-50 text-orange-700',
  TRAINING: 'bg-purple-50 text-purple-700',
};

export function AvailabilityPage(): React.ReactElement {
  const { user, isSuperAdmin, selectedTenant } = useAuth();
  const {
    getMyAvailability,
    listAvailability,
    createAvailability,
    deleteAvailability,
    loading,
    error,
  } = useWorkforce();
  const [items, setItems] = useState<StaffAvailability[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('AVAILABLE');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const isAdmin =
    user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN';
  const [viewMode, setViewMode] = useState<'mine' | 'team'>(isAdmin ? 'team' : 'mine');

  const load = async () => {
    try {
      // Show next 30 days
      const from = new Date().toISOString().split('T')[0];
      const to = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      if (viewMode === 'team' && isAdmin) {
        const result = await listAvailability({ from, to });
        setItems(result.data);
      } else {
        const data = await getMyAvailability({ from, to });
        setItems(data);
      }
    } catch {
      // error shown via hook
    }
  };

  useEffect(() => {
    if (isSuperAdmin && !selectedTenant) return;
    load();
  }, [selectedTenant, viewMode]); // eslint-disable-line

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await createAvailability({
        date,
        endDate: endDate || undefined,
        type,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        notes: notes || undefined,
      });
      setShowForm(false);
      setDate('');
      setEndDate('');
      setType('AVAILABLE');
      setStartTime('');
      setEndTime('');
      setNotes('');
      load();
    } catch {
      // error
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAvailability(id);
      load();
    } catch {
      // error
    }
  };

  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 text-center py-20">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Select a Tenant First</h2>
        <p className="text-slate-500 text-sm mb-6">Select a tenant to manage availability.</p>
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
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Availability</h1>
          <p className="text-slate-500 text-sm">
            {viewMode === 'team' ? 'Team availability for the next 30 days' : 'Your availability'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setViewMode('mine')}
                className={`px-3 py-2 text-sm cursor-pointer border-none transition-colors ${
                  viewMode === 'mine'
                    ? 'bg-accent text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                My Availability
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={`px-3 py-2 text-sm cursor-pointer border-none transition-colors ${
                  viewMode === 'team'
                    ? 'bg-accent text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Team View
              </button>
            </div>
          )}
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
            Add Availability
          </button>
        </div>
      </div>

      <ErrorAlert message={error} className="mb-4" />

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-100 p-6 mb-6"
        >
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Set Availability</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">End Date (optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={date}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                {availabilityTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Start Time (optional)</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">End Time (optional)</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              className="px-5 py-2 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors"
            >
              Save
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
        <div className="text-center py-12 text-slate-400 text-sm">Loading availability...</div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-6 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Date
              </th>
              {viewMode === 'team' && (
                <th className="px-6 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Staff
                </th>
              )}
              <th className="px-6 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-3.5 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3.5 text-sm text-slate-900">
                  {new Date(item.date).toLocaleDateString()}
                  {item.endDate && ` – ${new Date(item.endDate).toLocaleDateString()}`}
                </td>
                {viewMode === 'team' && item.user && (
                  <td className="px-6 py-3.5 text-sm text-slate-600">
                    {item.user.firstName} {item.user.lastName}
                  </td>
                )}
                <td className="px-6 py-3.5">
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[item.type] ?? 'bg-slate-50 text-slate-600'}`}
                  >
                    {item.type.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-sm text-slate-600">
                  {item.startTime && item.endTime ? `${item.startTime}–${item.endTime}` : 'All day'}
                </td>
                <td className="px-6 py-3.5 text-sm text-slate-500">{item.notes ?? '—'}</td>
                <td className="px-6 py-3.5">
                  {(viewMode === 'mine' || !item.user) && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-400 hover:text-red-500 bg-transparent border-none cursor-pointer p-1 transition-colors"
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
                  )}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={viewMode === 'team' ? 6 : 5}
                  className="px-6 py-12 text-center text-slate-400 text-sm"
                >
                  No availability records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
