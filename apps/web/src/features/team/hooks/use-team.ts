import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

export interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface CreateMemberForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface PaginatedResult {
  data: TeamMember[];
  total: number;
  page: number;
  limit: number;
}

export function useTeam() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (page = 1, limit = 20): Promise<PaginatedResult> => {
    setLoading(true);
    setError(null);
    try {
      return await api.get<PaginatedResult>(`/users?page=${page}&limit=${limit}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load team';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (form: CreateMemberForm): Promise<TeamMember> => {
    return api.post<TeamMember>('/users', form);
  }, []);

  const update = useCallback(
    async (id: string, data: Record<string, unknown>): Promise<TeamMember> => {
      return api.patch<TeamMember>(`/users/${id}`, data);
    },
    [],
  );

  const deactivate = useCallback(async (id: string): Promise<TeamMember> => {
    return api.patch<TeamMember>(`/users/${id}`, { isActive: false });
  }, []);

  const reactivate = useCallback(async (id: string): Promise<TeamMember> => {
    return api.patch<TeamMember>(`/users/${id}`, { isActive: true });
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  }, []);

  return { list, create, update, deactivate, reactivate, remove, loading, error };
}
