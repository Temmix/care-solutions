import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api-client';
import type { User, AuthTokens, AuthState } from '../types/auth';

interface RegisterParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantName?: string;
  organizationType?: string;
}

interface SelectedTenant {
  id: string;
  name: string;
  type: string;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  selectedTenant: SelectedTenant | null;
  selectTenant: (tenant: SelectedTenant | null) => void;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [selectedTenant, setSelectedTenant] = useState<SelectedTenant | null>(null);

  const isSuperAdmin = state.user?.role === 'SUPER_ADMIN';

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

  const selectTenant = useCallback((tenant: SelectedTenant | null) => {
    setSelectedTenant(tenant);
    api.setTenantId(tenant?.id ?? null);
  }, []);

  const login = async (email: string, password: string) => {
    const tokens = await api.post<AuthTokens>('/auth/login', { email, password });
    localStorage.setItem('access_token', tokens.accessToken);
    localStorage.setItem('refresh_token', tokens.refreshToken);
    setSelectedTenant(null);
    api.setTenantId(null);
    await fetchProfile();
  };

  const register = async (params: RegisterParams) => {
    const tokens = await api.post<AuthTokens>('/auth/register', params);
    localStorage.setItem('access_token', tokens.accessToken);
    localStorage.setItem('refresh_token', tokens.refreshToken);
    setSelectedTenant(null);
    api.setTenantId(null);
    await fetchProfile();
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setSelectedTenant(null);
    api.setTenantId(null);
    setState({ user: null, isAuthenticated: false, isLoading: false });
  };

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
