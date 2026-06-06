/**
 * Shift times (HH:mm on a pattern) are wall-clock times in the organisation's
 * local timezone, but shift dates are stored as @db.Date (UTC midnight). The
 * absolute instant of a shift therefore depends on the timezone — and in summer
 * (BST) that's an hour off UTC. These helpers resolve a shift's wall-clock time
 * to an absolute instant using the configured timezone, with DST handled by
 * Intl (no external library).
 *
 * Per-organisation timezones can be layered on later by passing the org's tz
 * instead of the app default.
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Europe/London';

/** Offset (ms) to add to a UTC instant to get the wall-clock time in `timeZone`. */
function tzOffsetMs(utcMs: number, timeZone: string): number {
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
  const parts = dtf.formatToParts(new Date(utcMs));
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = Number(p.value);
  }
  // Some engines render midnight as hour 24; normalise to 0.
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour % 24, map.minute, map.second);
  return asUtc - utcMs;
}

/**
 * The calendar day in `timeZone` for instant `at`, returned as the UTC-midnight
 * Date used to store shift dates (@db.Date). Use this to compute "today" in the
 * organisation's timezone rather than the server's — e.g. just after midnight in
 * London the server (UTC) may still be on the previous calendar day.
 */
export function orgCalendarDayUtc(timeZone: string = APP_TIMEZONE, at: Date = new Date()): Date {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const map: Record<string, number> = {};
  for (const p of dtf.formatToParts(at)) {
    if (p.type !== 'literal') map[p.type] = Number(p.value);
  }
  return new Date(Date.UTC(map.year, map.month - 1, map.day));
}

/**
 * Absolute instant for `minutesSinceMidnight` of the calendar day in `date`
 * (its UTC parts), interpreted as wall-clock time in `timeZone`. Minutes >= 1440
 * roll into the next day, so overnight shift ends work transparently.
 */
export function zonedShiftInstant(
  date: Date,
  minutesSinceMidnight: number,
  timeZone: string = APP_TIMEZONE,
): Date {
  const dayOffset = Math.floor(minutesSinceMidnight / 1440);
  const within = minutesSinceMidnight % 1440;
  const hour = Math.floor(within / 60);
  const minute = within % 60;
  // Guess the instant by treating the wall time as UTC, then correct by the
  // timezone offset at that instant (DST-aware).
  const guess = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + dayOffset,
    hour,
    minute,
  );
  return new Date(guess - tzOffsetMs(guess, timeZone));
}
