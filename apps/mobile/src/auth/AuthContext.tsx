import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../lib/api-client';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getSelectedTenantId,
  setSelectedTenantId,
} from '../lib/secure-store';
import type { AuthResponse, Membership, UserProfile } from '../types';

type Status = 'loading' | 'unauthenticated' | 'needs-tenant' | 'authenticated';

interface AuthState {
  status: Status;
  profile: UserProfile | null;
  memberships: Membership[];
  tenantId: string | null;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  selectTenant: (organizationId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const finishSignIn = useCallback(async (selectedTenantId: string) => {
    await setSelectedTenantId(selectedTenantId);
    setTenantId(selectedTenantId);
    const me = await api.get<UserProfile>('/auth/me');
    setProfile(me);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await clearTokens();
    await setSelectedTenantId(null);
    setProfile(null);
    setMemberships([]);
    setTenantId(null);
    setMustChangePassword(false);
    setStatus('unauthenticated');
  }, []);

  // Restore a prior session on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [token, savedTenant] = await Promise.all([getAccessToken(), getSelectedTenantId()]);
        if (cancelled) return;
        if (!token || !savedTenant) {
          setStatus('unauthenticated');
          return;
        }
        setTenantId(savedTenant);
        const me = await api.get<UserProfile>('/auth/me');
        if (cancelled) return;
        setProfile(me);
        setStatus('authenticated');
      } catch {
        if (!cancelled) {
          await clearTokens();
          setStatus('unauthenticated');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset to the login screen whenever a refresh ultimately fails.
  useEffect(() => {
    api.setLogoutHandler(() => {
      void logout();
    });
  }, [logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<AuthResponse>('/auth/login', { email, password });
      await setTokens(res.accessToken, res.refreshToken);
      setMemberships(res.memberships);
      setMustChangePassword(Boolean(res.mustChangePassword));

      if (res.memberships.length === 0) {
        await clearTokens();
        throw new Error('Your account is not linked to an organisation. Contact your manager.');
      }
      if (res.memberships.length === 1) {
        await finishSignIn(res.memberships[0].organizationId);
        return;
      }
      setStatus('needs-tenant');
    },
    [finishSignIn],
  );

  const selectTenant = useCallback(
    async (organizationId: string) => {
      await finishSignIn(organizationId);
    },
    [finishSignIn],
  );

  const value = useMemo<AuthState>(
    () => ({
      status,
      profile,
      memberships,
      tenantId,
      mustChangePassword,
      login,
      selectTenant,
      logout,
    }),
    [status, profile, memberships, tenantId, mustChangePassword, login, selectTenant, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
