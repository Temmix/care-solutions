import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { api } from '../lib/api-client';
import type { User, AuthTokens, AuthState, TenantMembership } from '../types/auth';

interface RegisterParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantName?: string;
  organizationType?: string;
  orgPhone?: string;
  orgEmail?: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

interface SelectedTenant {
  id: string;
  name: string;
  type: string;
  enabledModules: string[];
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  selectedTenant: SelectedTenant | null;
  selectTenant: (tenant: SelectedTenant | null) => void;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  isPlatformAdmin: boolean;
  currentRole: string | null;
  memberships: TenantMembership[];
  isModuleEnabled: (moduleCode: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadPersistedTenant(): SelectedTenant | null {
  try {
    const raw = localStorage.getItem('selected_tenant');
    if (raw) return JSON.parse(raw) as SelectedTenant;
  } catch {
    // ignore
  }
  return null;
}

function persistTenant(tenant: SelectedTenant | null): void {
  if (tenant) {
    localStorage.setItem('selected_tenant', JSON.stringify(tenant));
  } else {
    localStorage.removeItem('selected_tenant');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [selectedTenant, setSelectedTenant] = useState<SelectedTenant | null>(() => {
    const persisted = loadPersistedTenant();
    // Sync API client immediately so the first request has the tenant header
    if (persisted) api.setTenantId(persisted.id);
    return persisted;
  });

  const isSuperAdmin = state.user?.role === 'SUPER_ADMIN';
  const isTenantAdmin = state.user?.role === 'TENANT_ADMIN';
  const isPlatformAdmin = isSuperAdmin || isTenantAdmin;

  const memberships = state.user?.memberships ?? [];

  // Derive current role from selected tenant's membership
  const currentRole = useMemo(() => {
    if (isSuperAdmin) return 'SUPER_ADMIN';
    if (isTenantAdmin) return 'TENANT_ADMIN';
    if (!selectedTenant || !state.user) return null;
    const membership = state.user.memberships?.find((m) => m.organizationId === selectedTenant.id);
    return membership?.role ?? null;
  }, [isSuperAdmin, isTenantAdmin, selectedTenant, state.user]);

  const fetchProfile = useCallback(async () => {
    try {
      const user = await api.get<User>('/auth/me');
      setState({ user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchProfile();
    } else {
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, [fetchProfile]);

  const selectTenant = useCallback(async (tenant: SelectedTenant | null) => {
    if (tenant) {
      api.setTenantId(tenant.id);
      try {
        const modules = await api.get<string[]>(`/organizations/${tenant.id}/modules`);
        tenant = { ...tenant, enabledModules: modules };
      } catch {
        tenant = { ...tenant, enabledModules: [] };
      }
    }
    setSelectedTenant(tenant);
    persistTenant(tenant);
    if (!tenant) api.setTenantId(null);
  }, []);

  const autoSelectTenant = useCallback(
    async (loginMemberships: TenantMembership[]) => {
      if (loginMemberships.length === 1) {
        const m = loginMemberships[0];
        const tenant: SelectedTenant = {
          id: m.organizationId,
          name: m.organization.name,
          type: m.organization.type,
          enabledModules: [],
        };
        await selectTenant(tenant);
      }
    },
    [selectTenant],
  );

  const login = async (email: string, password: string) => {
    const result = await api.post<AuthTokens>('/auth/login', { email, password });
    localStorage.setItem('access_token', result.accessToken);
    localStorage.setItem('refresh_token', result.refreshToken);

    // Clear previous tenant selection
    selectTenant(null);

    await fetchProfile();

    // Auto-select if single membership
    if (result.memberships && result.memberships.length > 0) {
      await autoSelectTenant(result.memberships);
    }
  };

  const register = async (params: RegisterParams) => {
    const result = await api.post<AuthTokens>('/auth/register', params);
    localStorage.setItem('access_token', result.accessToken);
    localStorage.setItem('refresh_token', result.refreshToken);

    selectTenant(null);
    await fetchProfile();

    if (result.memberships && result.memberships.length > 0) {
      await autoSelectTenant(result.memberships);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    selectTenant(null);
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, [selectTenant]);

  const isModuleEnabled = useCallback(
    (moduleCode: string): boolean => {
      if (isPlatformAdmin) return true;
      if (!selectedTenant || selectedTenant.enabledModules.length === 0) return true;
      return selectedTenant.enabledModules.includes(moduleCode);
    },
    [isPlatformAdmin, selectedTenant],
  );

  // Register the logout handler so the API client can force logout on refresh failure
  useEffect(() => {
    api.setLogoutHandler(logout);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshProfile: fetchProfile,
        selectedTenant,
        selectTenant,
        isSuperAdmin,
        isTenantAdmin,
        isPlatformAdmin,
        currentRole,
        memberships,
        isModuleEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
