import { useState, useCallback } from 'react';
import { api } from '../../../lib/api-client';

// ── Types ────────────────────────────────────────────────

export interface IotDevice {
  id: string;
  serialNumber: string;
  deviceType: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  status: string;
  lastSeenAt?: string;
  batteryLevel?: number;
  isOnline: boolean;
  assignments: IotDeviceAssignment[];
  observations?: {
    id: string;
    vitalType: string;
    value: number;
    unit: string;
    recordedAt: string;
  }[];
  createdAt: string;
}

export interface IotDeviceAssignment {
  id: string;
  assignedAt: string;
  unassignedAt?: string;
  isActive: boolean;
  enrolment: {
    id: string;
    patient: { id?: string; givenName: string; familyName: string };
  };
}

export interface IotApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  isActive: boolean;
  lastUsedAt?: string;
  expiresAt?: string;
  deviceId?: string;
  device?: { serialNumber: string; deviceType: string };
  createdAt: string;
}

export interface CreateApiKeyResponse extends IotApiKey {
  rawKey: string;
}

export interface DeviceListResult {
  data: IotDevice[];
  total: number;
  page: number;
  limit: number;
}

// ── Hook ─────────────────────────────────────────────────

export function useIot() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Devices ──────────────────────────────────────────

  const listDevices = useCallback(
    async (params?: {
      status?: string;
      deviceType?: string;
      page?: number;
      limit?: number;
    }): Promise<DeviceListResult> => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (params?.status) qs.set('status', params.status);
        if (params?.deviceType) qs.set('deviceType', params.deviceType);
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        return await api.get<DeviceListResult>(`/iot/devices?${qs.toString()}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load devices';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getDevice = useCallback(async (id: string): Promise<IotDevice> => {
    setLoading(true);
    setError(null);
    try {
      return await api.get<IotDevice>(`/iot/devices/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load device';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerDevice = useCallback(
    async (data: {
      serialNumber: string;
      deviceType: string;
      manufacturer?: string;
      model?: string;
    }): Promise<IotDevice> => {
      return api.post<IotDevice>('/iot/devices', data);
    },
    [],
  );

  const updateDevice = useCallback(
    async (
      id: string,
      data: { manufacturer?: string; model?: string; firmwareVersion?: string },
    ): Promise<IotDevice> => {
      return api.patch<IotDevice>(`/iot/devices/${id}`, data);
    },
    [],
  );

  const decommissionDevice = useCallback(async (id: string): Promise<IotDevice> => {
    return api.post<IotDevice>(`/iot/devices/${id}/decommission`, {});
  }, []);

  const assignDevice = useCallback(
    async (deviceId: string, enrolmentId: string): Promise<IotDeviceAssignment> => {
      return api.post<IotDeviceAssignment>(`/iot/devices/${deviceId}/assign`, { enrolmentId });
    },
    [],
  );

  const unassignDevice = useCallback(async (deviceId: string): Promise<void> => {
    await api.post(`/iot/devices/${deviceId}/unassign`, {});
  }, []);

  // ── API Keys ─────────────────────────────────────────

  const listApiKeys = useCallback(async (): Promise<IotApiKey[]> => {
    return api.get<IotApiKey[]>('/iot/api-keys');
  }, []);

  const createApiKey = useCallback(
    async (data: {
      name: string;
      deviceId?: string;
      expiresAt?: string;
    }): Promise<CreateApiKeyResponse> => {
      return api.post<CreateApiKeyResponse>('/iot/api-keys', data);
    },
    [],
  );

  const revokeApiKey = useCallback(async (id: string): Promise<void> => {
    await api.delete(`/iot/api-keys/${id}`);
  }, []);

  return {
    listDevices,
    getDevice,
    registerDevice,
    updateDevice,
    decommissionDevice,
    assignDevice,
    unassignDevice,
    listApiKeys,
    createApiKey,
    revokeApiKey,
    loading,
    error,
  };
}
