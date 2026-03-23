import { useCallback } from 'react';
import { api } from '../../../lib/api-client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationListResult {
  data: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export interface NotificationPreference {
  id: string;
  eventType: string;
  channel: string;
  enabled: boolean;
}

export function useNotifications() {
  const getNotifications = useCallback(
    async (params: { page?: number; limit?: number; unreadOnly?: boolean } = {}) => {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.unreadOnly) query.set('unreadOnly', 'true');
      const qs = query.toString();
      return api.get<NotificationListResult>(`/notifications${qs ? `?${qs}` : ''}`);
    },
    [],
  );

  const getUnreadCount = useCallback(async (): Promise<number> => {
    return api.get<number>('/notifications/unread-count');
  }, []);

  const markRead = useCallback(async (id: string) => {
    return api.patch<Notification>(`/notifications/${id}/read`, {});
  }, []);

  const markAllRead = useCallback(async () => {
    return api.post<{ count: number }>('/notifications/mark-all-read', {});
  }, []);

  const getPreferences = useCallback(async () => {
    return api.get<NotificationPreference[]>('/notifications/preferences');
  }, []);

  const updatePreferences = useCallback(
    async (preferences: { eventType: string; channel: string; enabled: boolean }[]) => {
      return api.put<NotificationPreference[]>('/notifications/preferences', { preferences });
    },
    [],
  );

  return {
    getNotifications,
    getUnreadCount,
    markRead,
    markAllRead,
    getPreferences,
    updatePreferences,
  };
}
