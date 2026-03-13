import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

export interface TenantAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface TenantAdminList {
  data: TenantAdmin[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateTenantAdminForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export function useTenantAdmins() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (page = 1, limit = 50): Promise<TenantAdminList> => {
    setLoading(true);
    setError(null);
    try {
      return await api.get<TenantAdminList>(`/users/tenant-admins?page=${page}&limit=${limit}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load tenant admins';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (data: CreateTenantAdminForm): Promise<TenantAdmin> => {
    return api.post<TenantAdmin>('/users/tenant-admins', data);
  }, []);

  const deactivate = useCallback(async (id: string): Promise<TenantAdmin> => {
    return api.patch<TenantAdmin>(`/users/tenant-admins/${id}/deactivate`, {});
  }, []);

  const reactivate = useCallback(async (id: string): Promise<TenantAdmin> => {
    return api.patch<TenantAdmin>(`/users/tenant-admins/${id}/reactivate`, {});
  }, []);

  return { list, create, deactivate, reactivate, loading, error };
}
