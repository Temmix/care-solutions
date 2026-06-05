import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api-client';
import type { TrainingRecord } from '../../types';

export const EXPIRING_SOON_DAYS = 30;

interface TrainingType {
  code: string;
  name: string;
}

/** Fallback for codes with no configured type: "BLS_FIRST_AID" -> "BLS First Aid". */
function humanizeCode(code: string): string {
  return code
    .split('_')
    .filter(Boolean)
    .map((w) =>
      w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join(' ');
}

/** Days until a date (negative = already past). null if no date. */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function isOverdue(r: TrainingRecord): boolean {
  if (r.status === 'OVERDUE' || r.status === 'EXPIRED') return true;
  const d = daysUntil(r.expiryDate);
  return d !== null && d < 0;
}

export function isExpiringSoon(r: TrainingRecord): boolean {
  if (isOverdue(r)) return false;
  const d = daysUntil(r.expiryDate);
  return d !== null && d <= EXPIRING_SOON_DAYS;
}

interface UseTraining {
  loading: boolean;
  error: string | null;
  records: TrainingRecord[];
  overdueCount: number;
  expiringCount: number;
  /** Friendly name for a training category code (falls back to a humanized code). */
  categoryLabel: (code: string) => string;
  refresh: () => Promise<void>;
}

const PRIORITY_RANK: Record<string, number> = { MANDATORY: 0, RECOMMENDED: 1, OPTIONAL: 2 };

/** The signed-in worker's own training records, most-urgent first. */
export function useTraining(): UseTraining {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [typeNames, setTypeNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      // Load the type config for friendly labels alongside the records; the
      // config is non-critical, so a failure there doesn't block the records.
      const [data, types] = await Promise.all([
        api.get<TrainingRecord[]>('/training/me'),
        api.get<TrainingType[]>('/training-types').catch(() => [] as TrainingType[]),
      ]);
      setTypeNames(Object.fromEntries(types.map((t) => [t.code, t.name])));
      // Most urgent first: overdue, then expiring soon, then by priority/title.
      const sorted = [...data].sort((a, b) => {
        const sev = (r: TrainingRecord) => (isOverdue(r) ? 0 : isExpiringSoon(r) ? 1 : 2);
        if (sev(a) !== sev(b)) return sev(a) - sev(b);
        const pa = PRIORITY_RANK[a.priority] ?? 3;
        const pb = PRIORITY_RANK[b.priority] ?? 3;
        if (pa !== pb) return pa - pb;
        return a.title.localeCompare(b.title);
      });
      setRecords(sorted);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const categoryLabel = useCallback(
    (code: string) => typeNames[code] ?? humanizeCode(code),
    [typeNames],
  );

  return {
    loading,
    error,
    records,
    overdueCount: records.filter(isOverdue).length,
    expiringCount: records.filter(isExpiringSoon).length,
    categoryLabel,
    refresh,
  };
}
