const API_BASE = import.meta.env.VITE_API_BASE || '/api';

interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

type LogoutHandler = () => void;

class ApiClient {
  private tenantId: string | null = null;
  private refreshing: Promise<boolean> | null = null;
  private onLogout: LogoutHandler | null = null;

  setTenantId(tenantId: string | null): void {
    this.tenantId = tenantId;
  }

  getTenantId(): string | null {
    return this.tenantId;
  }

  setLogoutHandler(handler: LogoutHandler): void {
    this.onLogout = handler;
  }

  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const tokens = (await response.json()) as { accessToken: string; refreshToken: string };
      localStorage.setItem('access_token', tokens.accessToken);
      localStorage.setItem('refresh_token', tokens.refreshToken);
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

  private buildHeaders(options: RequestInit = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (this.tenantId) {
      headers['X-Tenant-Id'] = this.tenantId;
    }

    return headers;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = this.buildHeaders(options);

    let response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    // On 401, attempt a silent token refresh and retry once
    if (response.status === 401 && !path.startsWith('/auth/')) {
      const refreshed = await this.refreshOnce();
      if (refreshed) {
        const retryHeaders = this.buildHeaders(options);
        response = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers: retryHeaders,
        });
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        this.onLogout?.();
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      let message = 'Something went wrong. Please try again.';
      try {
        const body: ApiErrorResponse = await response.json();
        if (Array.isArray(body.message)) {
          message = body.message.join('. ');
        } else if (typeof body.message === 'string') {
          message = body.message;
        }
      } catch {
        // If JSON parsing fails, use status-based messages
        if (response.status === 403) message = 'You do not have permission to perform this action.';
        else if (response.status === 404) message = 'The requested resource was not found.';
        else if (response.status === 409) message = 'This action conflicts with existing data.';
        else if (response.status >= 500)
          message = 'A server error occurred. Please try again later.';
      }
      throw new Error(message);
    }

    // Handle empty responses (e.g. 204 No Content from DELETE)
    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
