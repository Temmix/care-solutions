import { zonedShiftInstant } from '../workforce/shift-time';

/**
 * Reports may be filed while on shift and for a grace period after the shift
 * ends, so workers can write up just after handover. This matches the
 * auto-clock-out threshold (shift end + 1 hour).
 */
export const REPORTING_GRACE_MIN = 60;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

interface ShiftLike {
  date: Date;
  shiftPattern: { startTime: string; endTime: string };
}

/** Instant after which reports can no longer be filed for this shift. */
export function reportingWindowClosesAt(shift: ShiftLike, timeZone: string): Date {
  const startMin = timeToMinutes(shift.shiftPattern.startTime);
  let endMin = timeToMinutes(shift.shiftPattern.endTime);
  if (endMin <= startMin) endMin += 24 * 60; // overnight shift
  const shiftEnd = zonedShiftInstant(shift.date, endMin, timeZone);
  return new Date(shiftEnd.getTime() + REPORTING_GRACE_MIN * 60_000);
}

/** Whether a report captured at `at` is within the shift's reporting window. */
export function isWithinReportingWindow(shift: ShiftLike, timeZone: string, at: Date): boolean {
  return at.getTime() <= reportingWindowClosesAt(shift, timeZone).getTime();
}
