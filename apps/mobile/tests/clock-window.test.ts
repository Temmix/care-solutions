import {
  clockWindow,
  clockInWindowState,
  humanizeUntil,
  CLOCK_IN_LEAD_MIN,
  type ClockWindow,
} from '../src/features/clock/clock-window';
import type { Shift } from '../src/types';

function shift(date: string, startTime: string, endTime: string): Shift {
  return {
    id: 's1',
    date,
    status: 'PUBLISHED',
    shiftPattern: { id: 'p1', name: 'Test', startTime, endTime, breakMinutes: 0 },
    location: null,
  };
}

const iso = (ms: number) => new Date(ms).toISOString();

describe('clockWindow (timezone-aware)', () => {
  it('interprets HH:mm as BST in summer (07:00 BST = 06:00 UTC)', () => {
    const w = clockWindow(shift('2026-06-05T00:00:00.000Z', '07:00', '19:00'));
    expect(iso(w.shiftStart)).toBe('2026-06-05T06:00:00.000Z');
    expect(iso(w.shiftEnd)).toBe('2026-06-05T18:00:00.000Z');
    // Window opens 30 min before start.
    expect(iso(w.windowStart)).toBe('2026-06-05T05:30:00.000Z');
    expect(w.shiftStart - w.windowStart).toBe(CLOCK_IN_LEAD_MIN * 60_000);
  });

  it('interprets HH:mm as GMT in winter (07:00 GMT = 07:00 UTC)', () => {
    const w = clockWindow(shift('2026-01-05T00:00:00.000Z', '07:00', '19:00'));
    expect(iso(w.shiftStart)).toBe('2026-01-05T07:00:00.000Z');
  });

  it('handles overnight shifts (end <= start rolls to the next day)', () => {
    const w = clockWindow(shift('2026-06-05T00:00:00.000Z', '20:00', '06:00'));
    // 20:00 -> 06:00 next day = a 10-hour shift.
    expect(w.shiftEnd - w.shiftStart).toBe(10 * 60 * 60_000);
    expect(w.shiftEnd).toBeGreaterThan(w.shiftStart);
  });
});

describe('clockInWindowState', () => {
  const w: ClockWindow = { windowStart: 1000, shiftStart: 2000, shiftEnd: 5000 };

  it('is "before" prior to the window opening', () => {
    expect(clockInWindowState(w, 500)).toBe('before');
  });
  it('is "open" within the window', () => {
    expect(clockInWindowState(w, 1500)).toBe('open');
    expect(clockInWindowState(w, 5000)).toBe('open'); // inclusive of end
  });
  it('is "ended" after the shift end', () => {
    expect(clockInWindowState(w, 6000)).toBe('ended');
  });
});

describe('humanizeUntil', () => {
  it('formats sub-hour durations in minutes', () => {
    expect(humanizeUntil(5 * 60_000)).toBe('5m');
    expect(humanizeUntil(0)).toBe('0m');
  });
  it('formats hour+ durations', () => {
    expect(humanizeUntil(60 * 60_000)).toBe('1h');
    expect(humanizeUntil(65 * 60_000)).toBe('1h 5m');
  });
  it('rounds up partial minutes', () => {
    expect(humanizeUntil(90_000)).toBe('2m'); // 1.5 min -> 2m
  });
});
