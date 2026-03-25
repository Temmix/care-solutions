import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '../src/hooks/use-auth';

vi.mock('../src/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    setTenantId: vi.fn(),
    setLogoutHandler: vi.fn(),
  },
}));

import { api } from '../src/lib/api-client';

const mockedApi = vi.mocked(api);

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'ADMIN',
  isActive: true,
  createdAt: '2025-01-01',
  tenantId: 'tenant-1',
  tenant: { id: 'tenant-1', name: 'Test Org', type: 'CARE_HOME' },
};

const superAdminUser = { ...mockUser, role: 'SUPER_ADMIN', tenantId: null, tenant: null };

const mockTokens = { accessToken: 'access-123', refreshToken: 'refresh-456' };

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });

  it('starts with isLoading then resolves when no token', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('login stores tokens and fetches profile', async () => {
    // login() calls api.post then localStorage.setItem then fetchProfile (api.get)
    mockedApi.post.mockResolvedValueOnce(mockTokens);
    mockedApi.get.mockResolvedValueOnce(mockUser); // for fetchProfile after login

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initial load (no token so quickly resolves)
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
    expect(mockedApi.setTenantId).toHaveBeenCalledWith(null);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('logout clears state', async () => {
    localStorage.setItem('access_token', 'existing-token');
    mockedApi.get.mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(mockedApi.setTenantId).toHaveBeenCalledWith(null);
  });

  it('selectTenant calls api.setTenantId', async () => {
    mockedApi.get.mockResolvedValueOnce(['patients', 'billing']); // modules fetch

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.selectTenant({
        id: 'tenant-1',
        name: 'Test Org',
        type: 'CARE_HOME',
        enabledModules: [],
      });
    });

    expect(mockedApi.setTenantId).toHaveBeenCalledWith('tenant-1');
    expect(result.current.selectedTenant).toEqual({
      id: 'tenant-1',
      name: 'Test Org',
      type: 'CARE_HOME',
      enabledModules: ['patients', 'billing'],
    });
  });

  it('isSuperAdmin is derived from user role', async () => {
    localStorage.setItem('access_token', 'token');
    mockedApi.get.mockResolvedValueOnce(superAdminUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.isSuperAdmin).toBe(true);
  });

  it('isSuperAdmin is false for regular users', async () => {
    localStorage.setItem('access_token', 'token');
    mockedApi.get.mockResolvedValueOnce(mockUser); // role: ADMIN

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.isSuperAdmin).toBe(false);
  });

  it('register stores tokens and fetches profile', async () => {
    mockedApi.post.mockResolvedValueOnce(mockTokens);
    mockedApi.get.mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const params = {
      email: 'new@example.com',
      password: 'pass1234',
      firstName: 'New',
      lastName: 'User',
      tenantName: 'My Org',
      organizationType: 'CARE_HOME',
    };

    await act(async () => {
      await result.current.register(params);
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/register', params);
    expect(result.current.isAuthenticated).toBe(true);
  });
});
