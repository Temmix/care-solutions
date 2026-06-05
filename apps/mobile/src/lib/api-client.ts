import { API_BASE } from '../config';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  getSelectedTenantId,
} from './secure-store';

/**
 * Mobile API client. Ported from apps/web/src/lib/api-client.ts, swapping
 * localStorage for expo-secure-store and reading the tenant from secure storage.
 * Keeps the same behaviour: auto-inject Authorization + X-Tenant-Id, and a
 * single-flight silent token refresh on 401.
 */

interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

type LogoutHandler = () => void;

class ApiClient {
  private refreshing: Promise<boolean> | null = null;
  private onLogout: LogoutHandler | null = null;

  setLogoutHandler(handler: LogoutHandler): void {
    this.onLogout = handler;
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;
      const tokens = (await response.json()) as { accessToken: string; refreshToken: string };
      await setTokens(tokens.accessToken, tokens.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  private async refreshOnce(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.tryRefreshToken().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  private async buildHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extra,
    };
    const token = await getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const tenantId = await getSelectedTenantId();
    if (tenantId) headers['X-Tenant-Id'] = tenantId;
    return headers;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    let response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: await this.buildHeaders(options.headers as Record<string, string>),
    });

    if (response.status === 401 && !path.startsWith('/auth/')) {
      const refreshed = await this.refreshOnce();
      if (refreshed) {
        response = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers: await this.buildHeaders(options.headers as Record<string, string>),
        });
      } else {
        await clearTokens();
        this.onLogout?.();
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      let message = 'Something went wrong. Please try again.';
      try {
        const body: ApiErrorResponse = await response.json();
        if (Array.isArray(body.message)) message = body.message.join('. ');
        else if (typeof body.message === 'string') message = body.message;
      } catch {
        if (response.status === 403) message = 'You do not have permission to perform this action.';
        else if (response.status === 404) message = 'The requested resource was not found.';
        else if (response.status === 409) message = 'This action conflicts with existing data.';
        else if (response.status >= 500)
          message = 'A server error occurred. Please try again later.';
      }
      throw new ApiError(message, response.status);
    }

    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

/** Error that preserves the HTTP status so callers can branch (e.g. offline). */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient();
