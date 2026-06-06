import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { api } from '../lib/api-client';

/**
 * Registers this device's Expo push token with the API after sign-in, and
 * unregisters it on sign-out.
 *
 * Push is NOT supported in Expo Go (removed in SDK 53+) and does nothing on
 * simulators. The native notification modules are therefore imported lazily,
 * inside the effect and only in a real dev/production build — importing
 * `expo-notifications` at startup in Expo Go throws at runtime.
 */
export function usePushRegistration(isAuthenticated: boolean): void {
  const registeredToken = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Expo Go can't do remote push — skip without touching the native module.
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;

    let cancelled = false;

    (async () => {
      const [Notifications, Device] = await Promise.all([
        import('expo-notifications'),
        import('expo-device'),
      ]);

      if (!Device.isDevice) return; // no push on simulators/emulators

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (status !== 'granted') {
        ({ status } = await Notifications.requestPermissionsAsync());
      }
      if (status !== 'granted') return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
      if (!projectId || projectId === 'REPLACE_WITH_EAS_PROJECT_ID') return;

      try {
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (cancelled || !token) return;
        registeredToken.current = token;
        await api.post('/notifications/device-tokens', {
          token,
          platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
        });
      } catch {
        // Non-fatal: the app works without push.
      }
    })();

    return () => {
      cancelled = true;
      const token = registeredToken.current;
      if (token) {
        registeredToken.current = null;
        void api.delete(`/notifications/device-tokens/${encodeURIComponent(token)}`).catch(() => {
          // best-effort cleanup
        });
      }
    };
  }, [isAuthenticated]);
}
