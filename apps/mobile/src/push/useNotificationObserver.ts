import { useEffect } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { navigateToTab, tabForNotificationType } from '../navigation/navigationRef';

/**
 * Routes tapped push notifications to the relevant tab. Handles both a tap while
 * the app is running and a cold start launched from a notification.
 *
 * Like registration, this lazy-imports expo-notifications and is a no-op in Expo
 * Go (where push isn't supported) so the module never loads there.
 */
export function useNotificationObserver(): void {
  useEffect(() => {
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;

    let mounted = true;
    let subscription: { remove: () => void } | undefined;

    (async () => {
      const Notifications = await import('expo-notifications');

      const open = (data: Record<string, unknown> | undefined): void => {
        const tab = tabForNotificationType(data?.type);
        if (tab) navigateToTab(tab);
      };

      // App opened by tapping a notification from a cold start.
      const last = await Notifications.getLastNotificationResponseAsync();
      if (mounted && last) {
        open(last.notification.request.content.data as Record<string, unknown>);
      }

      // Taps while the app is running/backgrounded.
      subscription = Notifications.addNotificationResponseReceivedListener((response) =>
        open(response.notification.request.content.data as Record<string, unknown>),
      );
    })();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);
}
