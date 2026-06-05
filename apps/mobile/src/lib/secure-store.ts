import * as SecureStore from 'expo-secure-store';

/**
 * Thin wrapper over expo-secure-store (Keychain on iOS, Keystore on Android).
 * Replaces the web client's localStorage for tokens and selected tenant.
 */

const ACCESS_TOKEN = 'access_token';
const REFRESH_TOKEN = 'refresh_token';
const SELECTED_TENANT = 'selected_tenant';

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN);
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN, refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN),
    SecureStore.deleteItemAsync(REFRESH_TOKEN),
  ]);
}

export async function getSelectedTenantId(): Promise<string | null> {
  return SecureStore.getItemAsync(SELECTED_TENANT);
}

export async function setSelectedTenantId(tenantId: string | null): Promise<void> {
  if (tenantId) {
    await SecureStore.setItemAsync(SELECTED_TENANT, tenantId);
  } else {
    await SecureStore.deleteItemAsync(SELECTED_TENANT);
  }
}
