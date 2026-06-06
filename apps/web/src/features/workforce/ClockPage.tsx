import { useEffect, useState } from 'react';
import { useGeolocation } from './hooks/use-geolocation';
import { useClock, type MyShiftToday } from './hooks/use-clock';
import { ErrorAlert } from '../../components/ErrorAlert';
import { OnShiftReportCard } from '../reports/OnShiftReportCard';

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  CLOCKED_IN: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Clocked In' },
  CLOCKED_OUT: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Clocked Out' },
  MISSED: { bg: 'bg-red-50', text: 'text-red-600', label: 'Missed' },
  AUTO_CLOCKED_OUT: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Auto Clocked Out' },
};

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

function haversineClient(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ShiftCard({
  assignment,
  gpsLat,
  gpsLng,
  gpsReady,
  onClockIn,
  onClockOut,
  actionLoading,
}: {
  assignment: MyShiftToday;
  gpsLat: number | null;
  gpsLng: number | null;
  gpsReady: boolean;
  onClockIn: (id: string) => void;
  onClockOut: (id: string) => void;
  actionLoading: string | null;
}): React.ReactElement {
  const { shift, clockRecord } = assignment;
  const pattern = shift.shiftPattern;
  const location = shift.location;
  const [confirmingOut, setConfirmingOut] = useState(false);

  // Client-side distance estimate
  let distanceText: string | null = null;
  if (
    gpsLat != null &&
    gpsLng != null &&
    location?.latitude != null &&
    location?.longitude != null
  ) {
    const dist = haversineClient(gpsLat, gpsLng, location.latitude, location.longitude);
    distanceText = dist < 1000 ? `${Math.round(dist)}m away` : `${(dist / 1000).toFixed(1)}km away`;
  }

  const isClockingIn = actionLoading === `in-${assignment.id}`;
  const isClockingOut = actionLoading === `out-${assignment.id}`;

  const canClockIn = !clockRecord && gpsReady;
  const canClockOut = clockRecord?.status === 'CLOCKED_IN';

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {formatTime(pattern.startTime)} — {formatTime(pattern.endTime)}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{pattern.name}</p>
        </div>
        {clockRecord && (
          <span
            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[clockRecord.status]?.bg ?? 'bg-slate-100'} ${STATUS_BADGE[clockRecord.status]?.text ?? 'text-slate-600'}`}
          >
            {STATUS_BADGE[clockRecord.status]?.label ?? clockRecord.status}
          </span>
        )}
      </div>

      {/* Location info */}
      {location && (
        <div className="flex items-center gap-2 mb-3 text-xs text-slate-600">
          <svg
            className="w-3.5 h-3.5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          <span>{location.name}</span>
          {distanceText && <span className="text-slate-400">({distanceText})</span>}
        </div>
      )}

      {/* Clock in/out times */}
      {clockRecord && (
        <div className="flex gap-4 mb-3 text-xs text-slate-500">
          <span>
            In:{' '}
            {new Date(clockRecord.clockInAt).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {clockRecord.clockInDistance != null &&
              ` (${Math.round(clockRecord.clockInDistance)}m)`}
          </span>
          {clockRecord.clockOutAt && (
            <span>
              Out:{' '}
              {new Date(clockRecord.clockOutAt).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        {canClockIn && (
          <button
            onClick={() => onClockIn(assignment.id)}
            disabled={isClockingIn}
            className="flex-1 py-2 text-sm font-medium rounded-lg cursor-pointer disabled:opacity-50 bg-accent text-white hover:bg-accent/90"
          >
            {isClockingIn ? 'Clocking In...' : 'Clock In'}
          </button>
        )}
        {canClockOut && !confirmingOut && (
          <button
            onClick={() => setConfirmingOut(true)}
            disabled={isClockingOut}
            className="flex-1 py-2 text-sm font-medium rounded-lg cursor-pointer disabled:opacity-50 bg-slate-800 text-white hover:bg-slate-700"
          >
            {isClockingOut ? 'Clocking Out...' : 'Clock Out'}
          </button>
        )}
        {canClockOut && confirmingOut && (
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-2">
              End your shift? You can't clock back in afterwards.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingOut(false)}
                disabled={isClockingOut}
                className="flex-1 py-2 text-sm font-medium rounded-lg cursor-pointer disabled:opacity-50 border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmingOut(false);
                  onClockOut(assignment.id);
                }}
                disabled={isClockingOut}
                className="flex-1 py-2 text-sm font-medium rounded-lg cursor-pointer disabled:opacity-50 bg-red-600 text-white hover:bg-red-700"
              >
                {isClockingOut ? 'Clocking Out...' : 'Yes, clock out'}
              </button>
            </div>
          </div>
        )}
        {!canClockIn && !canClockOut && !clockRecord && (
          <div className="text-xs text-slate-400 py-2">
            {gpsReady ? 'Outside clock-in window' : 'Waiting for GPS...'}
          </div>
        )}
      </div>
    </div>
  );
}

export function ClockPage(): React.ReactElement {
  const { position, status: geoStatus, error: geoError, requestPosition } = useGeolocation();
  const { shifts, loading, error: clockError, fetchMyShiftsToday, clockIn, clockOut } = useClock();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    requestPosition();
    fetchMyShiftsToday();
  }, [requestPosition, fetchMyShiftsToday]);

  const handleClockIn = async (assignmentId: string) => {
    if (!position) return;
    setActionLoading(`in-${assignmentId}`);
    try {
      await clockIn(assignmentId, position.latitude, position.longitude);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClockOut = async (assignmentId: string) => {
    setActionLoading(`out-${assignmentId}`);
    try {
      await clockOut(assignmentId, position?.latitude, position?.longitude);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Clock In / Out</h1>
        <p className="text-slate-500 text-sm mt-1">Clock in and out of your shifts for today</p>
      </div>

      {/* GPS Status */}
      <div
        className={`mb-6 p-3 rounded-lg flex items-center gap-3 ${
          geoStatus === 'ready'
            ? 'bg-emerald-50'
            : geoStatus === 'denied'
              ? 'bg-red-50'
              : geoStatus === 'error'
                ? 'bg-amber-50'
                : 'bg-blue-50'
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            geoStatus === 'ready'
              ? 'bg-emerald-500'
              : geoStatus === 'denied'
                ? 'bg-red-500'
                : geoStatus === 'error'
                  ? 'bg-amber-500'
                  : 'bg-blue-500 animate-pulse'
          }`}
        />
        <div className="flex-1">
          <span
            className={`text-sm font-medium ${
              geoStatus === 'ready'
                ? 'text-emerald-900'
                : geoStatus === 'denied'
                  ? 'text-red-900'
                  : geoStatus === 'error'
                    ? 'text-amber-900'
                    : 'text-blue-900'
            }`}
          >
            {geoStatus === 'idle' && 'Location access needed'}
            {geoStatus === 'acquiring' && 'Acquiring GPS position...'}
            {geoStatus === 'ready' &&
              `GPS ready (accuracy: ${Math.round(position?.accuracy ?? 0)}m)`}
            {geoStatus === 'denied' && 'Location access denied'}
            {geoStatus === 'error' && (geoError ?? 'GPS error')}
          </span>
          {position && position.accuracy > 100 && geoStatus === 'ready' && (
            <p className="text-xs text-amber-600 mt-0.5">
              Low accuracy — move to an open area for better results.
            </p>
          )}
        </div>
        {(geoStatus === 'denied' || geoStatus === 'error') && (
          <button
            onClick={requestPosition}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>

      {/* Error */}
      <ErrorAlert message={clockError} className="mb-6" />

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400 text-sm">Loading your shifts...</div>
        </div>
      )}

      {/* No shifts */}
      {!loading && shifts.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 text-center py-16">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No Shifts Today</h2>
          <p className="text-slate-500 text-sm">You don't have any shifts scheduled for today.</p>
        </div>
      )}

      {/* Shift cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shifts.map((assignment) => (
          <ShiftCard
            key={assignment.id}
            assignment={assignment}
            gpsLat={position?.latitude ?? null}
            gpsLng={position?.longitude ?? null}
            gpsReady={geoStatus === 'ready'}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            actionLoading={actionLoading}
          />
        ))}
      </div>

      {/* On-shift care reporting (renders only when clocked in & in window) */}
      <OnShiftReportCard />
    </div>
  );
}
