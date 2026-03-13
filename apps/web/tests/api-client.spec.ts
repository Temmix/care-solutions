import { api } from '../src/lib/api-client';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    api.setTenantId(null);
  });

  describe('setTenantId / getTenantId', () => {
    it('defaults to null', () => {
      expect(api.getTenantId()).toBeNull();
    });

    it('stores and returns the tenant id', () => {
      api.setTenantId('tenant-123');
      expect(api.getTenantId()).toBe('tenant-123');
    });

    it('can be reset to null', () => {
      api.setTenantId('tenant-123');
      api.setTenantId(null);
      expect(api.getTenantId()).toBeNull();
    });
  });

  describe('GET request', () => {
    it('sends correct headers and calls fetch with correct URL', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

      await api.get('/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('POST request', () => {
    it('sends JSON body with POST method', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));

      const body = { name: 'test' };
      await api.post('/items', body);

      expect(mockFetch).toHaveBeenCalledWith('/api/items', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('PATCH request', () => {
    it('sends JSON body with PATCH method', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));

      const body = { name: 'updated' };
      await api.patch('/items/1', body);

      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('DELETE request', () => {
    it('calls fetch with correct URL', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await api.delete('/items/1');

      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('Authorization header', () => {
    it('includes Authorization header when token is in localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('my-token');
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await api.get('/secure');

      const call = mockFetch.mock.calls[0];
      expect(call[1].headers['Authorization']).toBe('Bearer my-token');
    });

    it('does not include Authorization header when no token', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await api.get('/public');

      const call = mockFetch.mock.calls[0];
      expect(call[1].headers['Authorization']).toBeUndefined();
    });
  });

  describe('X-Tenant-Id header', () => {
    it('includes X-Tenant-Id header when tenant is set', async () => {
      api.setTenantId('tenant-abc');
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await api.get('/data');

      const call = mockFetch.mock.calls[0];
      expect(call[1].headers['X-Tenant-Id']).toBe('tenant-abc');
    });

    it('does not include X-Tenant-Id when tenant is null', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await api.get('/data');

      const call = mockFetch.mock.calls[0];
      expect(call[1].headers['X-Tenant-Id']).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws Error with message from API error response on non-ok', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ statusCode: 401, message: 'Unauthorized' }, 401),
      );

      await expect(api.get('/fail')).rejects.toThrow('Unauthorized');
    });

    it('throws "Request failed" when error message is not a string', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ statusCode: 500, message: 123 }, 500));

      await expect(api.get('/fail')).rejects.toThrow('Request failed');
    });
  });
});
