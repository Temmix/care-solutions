import { createNavigationContainerRef } from '@react-navigation/native';

export type TabName = 'Clock' | 'Shifts' | 'Swaps' | 'Training' | 'Profile';

/** Lets us navigate from outside React (e.g. a tapped push notification). */
export const navigationRef = createNavigationContainerRef();

export function navigateToTab(tab: TabName): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate(tab as never);
  }
}

/** Map a notification's `type` (the NotificationType enum) to the tab to open. */
export function tabForNotificationType(type: unknown): TabName | null {
  if (typeof type !== 'string') return null;
  if (type.startsWith('TRAINING')) return 'Training';
  if (type.startsWith('SHIFT_SWAP')) return 'Swaps';
  if (type.startsWith('SHIFT')) return 'Clock';
  return null;
}
