import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/api-client';

export interface SpecialtyTypeOption {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
}

export function useSpecialtyTypes() {
  const [types, setTypes] = useState<SpecialtyTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<SpecialtyTypeOption[]>('/specialty-types');
      setTypes(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load specialty types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  return { types, loading, error, refetch: fetchTypes };
}
