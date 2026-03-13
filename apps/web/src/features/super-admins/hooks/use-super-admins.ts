import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

export interface SuperAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface SuperAdminList {
  data: SuperAdmin[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateSuperAdminForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export function useSuperAdmins() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (page = 1, limit = 50): Promise<SuperAdminList> => {
    setLoading(true);
    setError(null);
    try {
      return await api.get<SuperAdminList>(`/users/super-admins?page=${page}&limit=${limit}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load super admins';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (data: CreateSuperAdminForm): Promise<SuperAdmin> => {
    return api.post<SuperAdmin>('/users/super-admins', data);
  }, []);

  const deactivate = useCallback(async (id: string): Promise<SuperAdmin> => {
    return api.patch<SuperAdmin>(`/users/super-admins/${id}/deactivate`, {});
  }, []);

  const reactivate = useCallback(async (id: string): Promise<SuperAdmin> => {
    return api.patch<SuperAdmin>(`/users/super-admins/${id}/reactivate`, {});
  }, []);

  return { list, create, deactivate, reactivate, loading, error };
}
