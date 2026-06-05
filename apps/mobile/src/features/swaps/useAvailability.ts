import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api-client';
import type { Availability, AvailabilityType } from '../../types';

export interface NewAvailability {
  type: AvailabilityType;
  date: string;
  endDate?: string;
  notes?: string;
}

interface UseAvailability {
  loading: boolean;
  error: string | null;
  items: Availability[];
  refresh: () => Promise<void>;
  create: (input: NewAvailability) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useAvailability(): UseAvailability {
  const [items, setItems] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<Availability[]>('/availability/me');
      setItems([...data].sort((a, b) => a.date.localeCompare(b.date)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(
    async (input: NewAvailability) => {
      await api.post('/availability', input);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await api.delete(`/availability/${id}`);
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, error, items, refresh, create, remove };
}
