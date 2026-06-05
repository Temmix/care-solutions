import type { Shift } from '../../types';

/**
 * Client-side mirror of the server's clock-in window so the UI can enable the
 * button only when clock-in will actually be accepted.
 *
 * Server logic (workforce.service.clockIn): the window opens 30 minutes before
 * shift start and closes at shift end. Times are anchored to the shift date's
 * UTC midnight (the API stores dates as @db.Date and the server runs in UTC),
 * so we compute absolute instants the same way and format display times in UTC
 * to match the HH:mm pattern strings shown elsewhere in the app.
 */
export const CLOCK_IN_LEAD_MIN = 30;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export interface ClockWindow {
  windowStart: number; // epoch ms
  shiftStart: number;
  shiftEnd: number;
}

export function clockWindow(shift: Shift): ClockWindow {
  const base = new Date(shift.date).getTime();
  const startMin = timeToMinutes(shift.shiftPattern.startTime);
  let endMin = timeToMinutes(shift.shiftPattern.endTime);
  if (endMin <= startMin) endMin += 24 * 60; // overnight shift
  const shiftStart = base + startMin * 60_000;
  const shiftEnd = base + endMin * 60_000;
  return { windowStart: shiftStart - CLOCK_IN_LEAD_MIN * 60_000, shiftStart, shiftEnd };
}

export type ClockInWindowState = 'before' | 'open' | 'ended';

export function clockInWindowState(w: ClockWindow, now: number): ClockInWindowState {
  if (now < w.windowStart) return 'before';
  if (now > w.shiftEnd) return 'ended';
  return 'open';
}

/** Format an instant as HH:mm in UTC (matches the pattern's wall-clock times). */
export function fmtTimeUTC(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** "12m" / "1h 5m" for a positive duration in ms. */
export function humanizeUntil(ms: number): string {
  const mins = Math.max(0, Math.ceil(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
