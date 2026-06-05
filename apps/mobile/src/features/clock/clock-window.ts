import type { Shift } from '../../types';

/**
 * Client-side mirror of the server's clock-in window so the UI can enable the
 * button only when clock-in will actually be accepted.
 *
 * Shift HH:mm are wall-clock times in the org timezone (default Europe/London),
 * so the absolute instant depends on GMT/BST. We resolve them with Intl exactly
 * like the API (apps/api .../shift-time.ts) — Hermes supports Intl timeZone.
 * Display times are formatted in the same timezone so "opens at 06:30" reads
 * in local time, matching the HH:mm shown on the card.
 */
export const CLOCK_IN_LEAD_MIN = 30;

export const APP_TIMEZONE = process.env.EXPO_PUBLIC_APP_TIMEZONE || 'Europe/London';

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Offset (ms) to add to a UTC instant to get the wall-clock time in `timeZone`.
 * Falls back to 0 (UTC) if Intl timeZone support is unavailable — the server
 * still enforces the real window, so worst case the gating degrades, not breaks. */
function tzOffsetMs(utcMs: number, timeZone: string): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const map: Record<string, number> = {};
    for (const p of dtf.formatToParts(new Date(utcMs))) {
      if (p.type !== 'literal') map[p.type] = Number(p.value);
    }
    const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour % 24, map.minute, map.second);
    return Number.isNaN(asUtc) ? 0 : asUtc - utcMs;
  } catch {
    return 0;
  }
}

/** Epoch ms for `minutesSinceMidnight` of the shift's day, in `timeZone`. */
function zonedInstant(shift: Shift, minutesSinceMidnight: number, timeZone: string): number {
  const d = new Date(shift.date);
  const dayOffset = Math.floor(minutesSinceMidnight / 1440);
  const within = minutesSinceMidnight % 1440;
  const guess = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + dayOffset,
    Math.floor(within / 60),
    within % 60,
  );
  return guess - tzOffsetMs(guess, timeZone);
}

export interface ClockWindow {
  windowStart: number; // epoch ms
  shiftStart: number;
  shiftEnd: number;
}

/** `timeZone` is the org's IANA zone; defaults to the app default if omitted. */
export function clockWindow(shift: Shift, timeZone: string = APP_TIMEZONE): ClockWindow {
  const startMin = timeToMinutes(shift.shiftPattern.startTime);
  let endMin = timeToMinutes(shift.shiftPattern.endTime);
  if (endMin <= startMin) endMin += 24 * 60; // overnight shift
  const shiftStart = zonedInstant(shift, startMin, timeZone);
  const shiftEnd = zonedInstant(shift, endMin, timeZone);
  return { windowStart: shiftStart - CLOCK_IN_LEAD_MIN * 60_000, shiftStart, shiftEnd };
}

export type ClockInWindowState = 'before' | 'open' | 'ended';

export function clockInWindowState(w: ClockWindow, now: number): ClockInWindowState {
  if (now < w.windowStart) return 'before';
  if (now > w.shiftEnd) return 'ended';
  return 'open';
}

/** Format an instant as HH:mm in `timeZone` (matches the card's times). */
export function fmtTime(ms: number, timeZone: string = APP_TIMEZONE): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(ms));
  } catch {
    const d = new Date(ms);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  }
}

/** "12m" / "1h 5m" for a positive duration in ms. */
export function humanizeUntil(ms: number): string {
  const mins = Math.max(0, Math.ceil(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
