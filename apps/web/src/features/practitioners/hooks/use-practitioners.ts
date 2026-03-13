import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

export interface Practitioner {
  id: string;
  resourceType: string;
  active?: boolean;
  name?: { family?: string; given?: string[] }[];
  gender?: string;
  telecom?: { system?: string; value?: string }[];
  qualification?: { code: { text?: string }; identifier?: { value?: string }[] }[];
}

interface PractitionerList {
  data: Practitioner[];
  total: number;
  page: number;
  limit: number;
}

export interface PractitionerForm {
  givenName: string;
  familyName: string;
  gender: string;
  phone: string;
  email: string;
  specialty: string;
  registrationNumber: string;
}

export function usePractitioners() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (page = 1, limit = 50): Promise<PractitionerList> => {
    setLoading(true);
    setError(null);
    try {
      return await api.get<PractitionerList>(`/practitioners?page=${page}&limit=${limit}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load practitioners';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback(async (id: string): Promise<Practitioner> => {
    return api.get<Practitioner>(`/practitioners/${id}`);
  }, []);

  const create = useCallback(
    async (data: PractitionerForm & { userId: string }): Promise<Practitioner> => {
      const payload: Record<string, unknown> = {
        givenName: data.givenName.trim(),
        familyName: data.familyName.trim(),
        userId: data.userId,
      };
      if (data.gender && data.gender !== 'UNKNOWN') payload.gender = data.gender;
      if (data.phone) payload.phone = data.phone.trim();
      if (data.email) payload.email = data.email.trim();
      if (data.specialty) payload.specialty = data.specialty.trim();
      if (data.registrationNumber) payload.registrationNumber = data.registrationNumber.trim();
      return api.post<Practitioner>('/practitioners', payload);
    },
    [],
  );

  const update = useCallback(
    async (
      id: string,
      data: Partial<PractitionerForm> & { active?: boolean },
    ): Promise<Practitioner> => {
      const payload: Record<string, unknown> = {};
      if (data.givenName !== undefined) payload.givenName = data.givenName.trim();
      if (data.familyName !== undefined) payload.familyName = data.familyName.trim();
      if (data.gender !== undefined) payload.gender = data.gender;
      if (data.phone !== undefined) payload.phone = data.phone.trim();
      if (data.email !== undefined) payload.email = data.email.trim();
      if (data.specialty !== undefined) payload.specialty = data.specialty.trim();
      if (data.registrationNumber !== undefined)
        payload.registrationNumber = data.registrationNumber.trim();
      if (data.active !== undefined) payload.active = data.active;
      return api.patch<Practitioner>(`/practitioners/${id}`, payload);
    },
    [],
  );

  return { list, get, create, update, loading, error };
}
