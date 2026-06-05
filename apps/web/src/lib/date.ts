/**
 * `YYYY-MM-DD` from a Date's LOCAL calendar parts.
 *
 * Prefer this over `date.toISOString().split('T')[0]`, which returns the UTC
 * day — in timezones ahead of UTC (e.g. BST) a local-midnight date stringifies
 * to the previous day, shifting "today" and date-range queries by a day.
 */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
