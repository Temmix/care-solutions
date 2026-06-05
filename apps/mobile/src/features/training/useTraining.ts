import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api-client';
import type { TrainingRecord } from '../../types';

export const EXPIRING_SOON_DAYS = 30;

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
  refresh: () => Promise<void>;
}

const PRIORITY_RANK: Record<string, number> = { MANDATORY: 0, RECOMMENDED: 1, OPTIONAL: 2 };

/** The signed-in worker's own training records, most-urgent first. */
export function useTraining(): UseTraining {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<TrainingRecord[]>('/training/me');
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

  return {
    loading,
    error,
    records,
    overdueCount: records.filter(isOverdue).length,
    expiringCount: records.filter(isExpiringSoon).length,
    refresh,
  };
}
