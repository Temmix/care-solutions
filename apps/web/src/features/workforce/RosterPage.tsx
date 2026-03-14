import { useState, useEffect, useMemo } from 'react';
import { useWorkforce, type Shift, type ShiftPattern } from './hooks/use-workforce';
import { useAuth } from '../../hooks/use-auth';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api-client';
import { ErrorAlert, WarningList } from '../../components/ErrorAlert';

interface TeamUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface LocationOption {
  id: string;
  name: string;
  type: string;
}

const statusDot: Record<string, string> = {
  DRAFT: 'bg-slate-300',
  PUBLISHED: 'bg-blue-400',
  IN_PROGRESS: 'bg-emerald-400',
  COMPLETED: 'bg-green-400',
  CANCELLED: 'bg-red-400',
};

const shiftTypeColors: Record<string, { bg: string; border: string; text: string }> = {
  EARLY: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
  LATE: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-800' },
  NIGHT: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800' },
  LONG_DAY: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
  TWILIGHT: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
  CUSTOM: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' },
};

const UNASSIGNED_KEY = '__unassigned__';

function getWeekDates(offset: number): { start: Date; end: Date; dates: Date[] } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  start.setHours(0, 0, 0, 0);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  const end = new Date(dates[6]);
  end.setHours(23, 59, 59, 999);
  return { start, end, dates };
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function RosterPage(): React.ReactElement {
  const { isSuperAdmin, selectedTenant } = useAuth();
  const {
    listShifts,
    listShiftPatterns,
    createShift,
    assignShift,
    deleteShift,
    removeAssignment,
    updateShift,
    loading,
    error,
  } = useWorkforce();
  const [weekOffset, setWeekOffset] = useState(0);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [patterns, setPatterns] = useState<ShiftPattern[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createPatternId, setCreatePatternId] = useState('');
  const [createLocationId, setCreateLocationId] = useState('');
  const [selectedDays, setSelectedDays] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ]);
  const [assignShiftId, setAssignShiftId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [collapsedLocations, setCollapsedLocations] = useState<Set<string>>(new Set());
  const [warnings, setWarnings] = useState<string[]>([]);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const week = getWeekDates(weekOffset);

  const load = async () => {
    try {
      const [shiftResult, patternList, locationList] = await Promise.all([
        listShifts({ from: formatDate(week.start), to: formatDate(week.end), limit: 200 }),
        listShiftPatterns(),
        api.get<LocationOption[]>('/locations'),
      ]);
      setShifts(shiftResult.data);
      setPatterns(patternList);
      setLocations(locationList);
    } catch {
      // error shown via hook
    }
  };

  const loadUsers = async () => {
    try {
      const result = await api.get<{ data: TeamUser[] }>('/users?limit=100');
      setUsers(result.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isSuperAdmin && !selectedTenant) return;
    load();
    loadUsers();
  }, [selectedTenant, weekOffset]); // eslint-disable-line

  // ── Date helpers ──────────────────────────────────────
  const todayStr = formatDate(new Date());
  const isPastDay = (index: number): boolean => formatDate(week.dates[index]) < todayStr;

  // ── Day selection for bulk create ─────────────────────
  const toggleDay = (index: number) => {
    if (isPastDay(index)) return;
    setSelectedDays((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const futureDays = week.dates.map((_, i) => !isPastDay(i));
  const allSelected = futureDays.every((f, i) => !f || selectedDays[i]);
  const someSelected = selectedDays.some(Boolean);

  const toggleAll = () => {
    setSelectedDays(allSelected ? [false, false, false, false, false, false, false] : futureDays);
  };

  const selectWeekdays = () => {
    setSelectedDays([true, true, true, true, true, false, false].map((v, i) => v && !isPastDay(i)));
  };

  // ── Group shifts by location → date ───────────────────
  const { locationRows, totalsByDay } = useMemo(() => {
    // Build a map: locationId → { dateStr → shifts[] }
    const grouped = new Map<string, Map<string, Shift[]>>();

    for (const shift of shifts) {
      const locKey = shift.location?.id ?? UNASSIGNED_KEY;
      if (!grouped.has(locKey)) grouped.set(locKey, new Map());
      const dateStr = shift.date.split('T')[0];
      const dayMap = grouped.get(locKey)!;
      if (!dayMap.has(dateStr)) dayMap.set(dateStr, []);
      dayMap.get(dateStr)!.push(shift);
    }

    // Build ordered rows: real locations first (sorted), then unassigned
    const rows: {
      key: string;
      name: string;
      type: string;
      dayMap: Map<string, Shift[]>;
      weekTotal: number;
    }[] = [];

    // Locations that have shifts this week
    const locIdsWithShifts = new Set(grouped.keys());

    // Include all locations (even empty ones for context), plus those with shifts
    const allLocationIds = new Set([...locations.map((l) => l.id), ...locIdsWithShifts]);

    for (const loc of locations) {
      if (!allLocationIds.has(loc.id)) continue;
      const dayMap = grouped.get(loc.id) ?? new Map<string, Shift[]>();
      let weekTotal = 0;
      dayMap.forEach((s) => (weekTotal += s.length));
      rows.push({ key: loc.id, name: loc.name, type: loc.type, dayMap, weekTotal });
    }

    // Sort by name
    rows.sort((a, b) => a.name.localeCompare(b.name));

    // Unassigned row at bottom
    if (grouped.has(UNASSIGNED_KEY)) {
      const dayMap = grouped.get(UNASSIGNED_KEY)!;
      let weekTotal = 0;
      dayMap.forEach((s) => (weekTotal += s.length));
      rows.push({ key: UNASSIGNED_KEY, name: 'Unassigned', type: '', dayMap, weekTotal });
    }

    // Totals per day column
    const totals: number[] = week.dates.map((date) => {
      const ds = formatDate(date);
      return shifts.filter((s) => s.date.split('T')[0] === ds).length;
    });

    return { locationRows: rows, totalsByDay: totals };
  }, [shifts, locations, week.dates]);

  // ── Location row collapse ─────────────────────────────
  const toggleCollapse = (locKey: string) => {
    setCollapsedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(locKey)) next.delete(locKey);
      else next.add(locKey);
      return next;
    });
  };

  // ── Actions ───────────────────────────────────────────
  const handleCreateShifts = async () => {
    if (!createPatternId || !someSelected) return;
    setCreateError(null);
    const dates = week.dates.filter((_, i) => selectedDays[i]).map(formatDate);
    try {
      await Promise.all(
        dates.map((date) =>
          createShift({
            date,
            shiftPatternId: createPatternId,
            locationId: createLocationId || undefined,
          }),
        ),
      );
      setShowCreate(false);
      setCreatePatternId('');
      setCreateLocationId('');
      setSelectedDays([false, false, false, false, false, false, false]);
      load();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to create shifts. Please try again.',
      );
    }
  };

  const handleAssign = async () => {
    if (!assignShiftId || !assignUserId) return;
    setAssignError(null);
    try {
      const result = await assignShift(assignShiftId, { userId: assignUserId });
      setAssignShiftId(null);
      setAssignUserId('');
      setAssignError(null);
      if (result.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings);
      }
      load();
    } catch (err) {
      setAssignError(
        err instanceof Error ? err.message : 'Failed to assign staff. Please try again.',
      );
    }
  };

  const handleRemoveAssignment = async (shiftId: string, userId: string) => {
    try {
      await removeAssignment(shiftId, userId);
      load();
    } catch {
      // error
    }
  };

  const handlePublish = async (shiftId: string) => {
    try {
      await updateShift(shiftId, { status: 'PUBLISHED' });
      load();
    } catch {
      // error shown via hook
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      await deleteShift(shiftId);
      load();
    } catch {
      // error shown via hook
    }
  };

  // ── Tenant guard ──────────────────────────────────────
  if (isSuperAdmin && !selectedTenant) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 text-center py-20">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Select a Tenant First</h2>
        <p className="text-slate-500 text-sm mb-6">Select a tenant to view the roster.</p>
        <Link
          to="/tenants"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-white no-underline rounded-lg text-sm font-medium transition-colors"
        >
          Select a Tenant
        </Link>
      </div>
    );
  }

  // ── Shift card renderer ───────────────────────────────
  const renderShiftCard = (shift: Shift) => {
    const colors = shiftTypeColors[shift.shiftPattern.shiftType] ?? shiftTypeColors.CUSTOM;
    return (
      <div
        key={shift.id}
        className={`p-2 rounded-lg border ${colors.bg} ${colors.border} text-xs space-y-1`}
      >
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[shift.status] ?? statusDot.DRAFT}`}
          />
          <span className={`font-medium truncate ${colors.text}`}>{shift.shiftPattern.name}</span>
        </div>
        <div className="text-slate-400 pl-3">
          {shift.shiftPattern.startTime}–{shift.shiftPattern.endTime}
        </div>
        {shift.assignments.length > 0 && (
          <div className="pl-3 space-y-0.5">
            {shift.assignments.map((a) => (
              <div key={a.id} className="flex items-center gap-1 group">
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[0.55rem] flex items-center justify-center font-medium shrink-0">
                  {a.user.firstName[0]}
                  {a.user.lastName[0]}
                </span>
                <span className="text-slate-600 truncate">
                  {a.user.firstName} {a.user.lastName[0]}.
                </span>
                <button
                  onClick={() => handleRemoveAssignment(shift.id, a.user.id)}
                  className="text-slate-300 hover:text-red-500 bg-transparent border-none cursor-pointer p-0 transition-colors opacity-0 group-hover:opacity-100 ml-auto shrink-0"
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-0.5 pl-3">
          <button
            onClick={() => {
              setAssignShiftId(shift.id);
              setAssignUserId('');
            }}
            className="text-accent text-[0.6rem] bg-transparent border-none cursor-pointer p-0 hover:underline"
          >
            + Staff
          </button>
          {shift.status === 'DRAFT' && (
            <button
              onClick={() => handlePublish(shift.id)}
              className="text-emerald-600 text-[0.6rem] bg-transparent border-none cursor-pointer p-0 hover:underline ml-auto"
            >
              Publish
            </button>
          )}
          {(shift.status === 'DRAFT' || shift.status === 'CANCELLED') &&
            shift.date.split('T')[0] >= todayStr && (
              <button
                onClick={() => handleDeleteShift(shift.id)}
                className="text-slate-300 hover:text-red-500 text-[0.6rem] bg-transparent border-none cursor-pointer p-0 hover:underline ml-auto"
                title="Delete shift"
              >
                Delete
              </button>
            )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Roster</h1>
          <p className="text-slate-500 text-sm">
            {monthNames[week.start.getMonth()]} {week.start.getDate()} –{' '}
            {monthNames[week.end.getMonth()]} {week.end.getDate()}, {week.end.getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Week navigation */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="px-3 py-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors border-none bg-transparent"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="px-4 py-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors border-x border-slate-200 bg-transparent font-medium"
            >
              This Week
            </button>
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              className="px-3 py-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors border-none bg-transparent"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-50 text-[0.65rem] text-slate-500">
            {Object.entries(shiftTypeColors).map(([type, c]) => (
              <span key={type} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded ${c.bg} border ${c.border}`} />
                {type.replace(/_/g, ' ')}
              </span>
            ))}
          </div>

          <button
            onClick={() => setShowCreate(!showCreate)}
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
            Schedule Shifts
          </button>
        </div>
      </div>

      <ErrorAlert message={error} className="mb-4" />
      <WarningList
        title="Assignment Warnings"
        items={warnings}
        onDismiss={() => setWarnings([])}
        className="mb-4"
      />

      {/* ── Create panel ─────────────────────────────────── */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Schedule Shifts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                Pattern
              </label>
              <select
                value={createPatternId}
                onChange={(e) => setCreatePatternId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">Select pattern...</option>
                {patterns.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.startTime}–{p.endTime})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                Location
              </label>
              <select
                value={createLocationId}
                onChange={(e) => setCreateLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">No specific location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Days
                </label>
                <button
                  onClick={toggleAll}
                  className="text-[0.65rem] text-accent bg-transparent border-none cursor-pointer hover:underline p-0"
                >
                  {allSelected ? 'Clear' : 'All'}
                </button>
                <button
                  onClick={selectWeekdays}
                  className="text-[0.65rem] text-accent bg-transparent border-none cursor-pointer hover:underline p-0"
                >
                  Weekdays
                </button>
              </div>
              <div className="flex gap-1">
                {week.dates.map((date, i) => {
                  const past = isPastDay(i);
                  return (
                    <button
                      key={formatDate(date)}
                      onClick={() => toggleDay(i)}
                      disabled={past}
                      className={`flex-1 flex flex-col items-center py-1.5 rounded-md border text-xs transition-colors ${
                        past
                          ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                          : selectedDays[i]
                            ? 'bg-accent text-white border-accent cursor-pointer'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-accent/50 cursor-pointer'
                      }`}
                    >
                      <span className="font-medium text-[0.6rem]">{dayNames[i]}</span>
                      <span>{date.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <ErrorAlert
            message={createError}
            onDismiss={() => setCreateError(null)}
            className="mb-4"
          />
          <div className="flex gap-3 border-t border-slate-100 pt-4">
            <button
              onClick={handleCreateShifts}
              disabled={!createPatternId || !someSelected || loading}
              className="px-5 py-2 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Creating...'
                : `Create ${selectedDays.filter(Boolean).length} Shift${selectedDays.filter(Boolean).length !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setSelectedDays([false, false, false, false, false, false, false]);
                setCreatePatternId('');
                setCreateLocationId('');
                setCreateError(null);
              }}
              className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm cursor-pointer hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Roster matrix ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {/* Day header row */}
        <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-slate-100">
          <div className="px-4 py-3 bg-slate-50 border-r border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Location
            </span>
          </div>
          {week.dates.map((date, i) => {
            const isToday = formatDate(date) === todayStr;
            return (
              <div
                key={formatDate(date)}
                className={`px-2 py-3 text-center border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-accent/5' : 'bg-slate-50'}`}
              >
                <div
                  className={`text-xs font-semibold ${isToday ? 'text-accent' : 'text-slate-500'}`}
                >
                  {dayNames[i]}
                </div>
                <div className={`text-lg font-bold ${isToday ? 'text-accent' : 'text-slate-700'}`}>
                  {date.getDate()}
                </div>
                {totalsByDay[i] > 0 && (
                  <div className="text-[0.6rem] text-slate-400 mt-0.5">
                    {totalsByDay[i]} shift{totalsByDay[i] !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {loading && shifts.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">Loading roster...</div>
        )}

        {!loading && locationRows.length === 0 && (
          <div className="text-center py-16">
            <div className="text-slate-400 text-sm mb-2">No locations or shifts this week</div>
            <p className="text-slate-400 text-xs">Create locations first, then schedule shifts.</p>
          </div>
        )}

        {/* Location rows */}
        {locationRows.map((locRow) => {
          const isCollapsed = collapsedLocations.has(locRow.key);
          const isUnassigned = locRow.key === UNASSIGNED_KEY;

          return (
            <div key={locRow.key} className="border-b border-slate-50 last:border-b-0">
              {/* Location row */}
              <div className="grid grid-cols-[200px_repeat(7,1fr)]">
                {/* Location label */}
                <div
                  className={`px-4 py-3 border-r border-slate-100 flex items-start gap-2 cursor-pointer hover:bg-slate-50/50 transition-colors ${isUnassigned ? 'bg-slate-50/30' : ''}`}
                  onClick={() => toggleCollapse(locRow.key)}
                >
                  <svg
                    className={`w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m8.25 4.5 7.5 7.5-7.5 7.5"
                    />
                  </svg>
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-semibold truncate ${isUnassigned ? 'text-slate-400 italic' : 'text-slate-800'}`}
                    >
                      {locRow.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {locRow.type && (
                        <span className="text-[0.6rem] text-slate-400 uppercase tracking-wider">
                          {locRow.type.replace(/_/g, ' ')}
                        </span>
                      )}
                      {locRow.weekTotal > 0 && (
                        <span className="text-[0.6rem] text-slate-400">
                          {locRow.weekTotal} shift{locRow.weekTotal !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Day cells */}
                {week.dates.map((date) => {
                  const dateStr = formatDate(date);
                  const isToday = dateStr === todayStr;
                  const cellShifts = locRow.dayMap.get(dateStr) ?? [];

                  return (
                    <div
                      key={dateStr}
                      className={`px-1.5 py-2 border-r border-slate-100 last:border-r-0 min-h-20 ${
                        isToday ? 'bg-accent/2' : ''
                      } ${isCollapsed ? 'hidden' : ''}`}
                    >
                      {cellShifts.length > 0 ? (
                        <div className="space-y-1.5">{cellShifts.map(renderShiftCard)}</div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <span className="text-slate-200 text-xs">—</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Collapsed summary row */}
                {isCollapsed &&
                  week.dates.map((date) => {
                    const dateStr = formatDate(date);
                    const isToday = dateStr === todayStr;
                    const cellShifts = locRow.dayMap.get(dateStr) ?? [];
                    const staffCount = cellShifts.reduce((sum, s) => sum + s.assignments.length, 0);

                    return (
                      <div
                        key={dateStr}
                        className={`px-1.5 py-2 border-r border-slate-100 last:border-r-0 flex items-center justify-center ${
                          isToday ? 'bg-accent/2' : ''
                        }`}
                      >
                        {cellShifts.length > 0 ? (
                          <div className="text-center">
                            <div className="text-sm font-semibold text-slate-700">
                              {cellShifts.length}
                            </div>
                            <div className="text-[0.6rem] text-slate-400">{staffCount} staff</div>
                          </div>
                        ) : (
                          <span className="text-slate-200 text-xs">—</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}

        {/* Summary footer */}
        {shifts.length > 0 && (
          <div className="grid grid-cols-[200px_repeat(7,1fr)] border-t border-slate-200 bg-slate-50/50">
            <div className="px-4 py-2.5 border-r border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total
              </span>
            </div>
            {week.dates.map((date, i) => {
              const isToday = formatDate(date) === todayStr;
              const staffCount = shifts
                .filter((s) => s.date.split('T')[0] === formatDate(date))
                .reduce((sum, s) => sum + s.assignments.length, 0);

              return (
                <div
                  key={formatDate(date)}
                  className={`px-2 py-2.5 text-center border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-accent/5' : ''}`}
                >
                  <span className="text-sm font-bold text-slate-700">{totalsByDay[i]}</span>
                  <span className="text-[0.6rem] text-slate-400 ml-1">({staffCount})</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Assign modal ─────────────────────────────────── */}
      {assignShiftId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Assign Staff</h3>
            <ErrorAlert
              message={assignError}
              onDismiss={() => setAssignError(null)}
              className="mb-4"
            />
            <select
              value={assignUserId}
              onChange={(e) => {
                setAssignUserId(e.target.value);
                setAssignError(null);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white mb-4"
            >
              <option value="">Select staff member...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.role})
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={handleAssign}
                disabled={!assignUserId || loading}
                className="flex-1 px-4 py-2 bg-accent hover:bg-accent-dark text-white border-none rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Assigning...' : 'Assign'}
              </button>
              <button
                onClick={() => {
                  setAssignShiftId(null);
                  setAssignError(null);
                }}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm cursor-pointer hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
