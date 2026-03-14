export interface TenantMembership {
  organizationId: string;
  role: string;
  organization: {
    id: string;
    name: string;
    type: string;
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  tenantId: string | null;
  tenant: {
    id: string;
    name: string;
    type: string;
  } | null;
  memberships: TenantMembership[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  mustChangePassword?: boolean;
  memberships?: TenantMembership[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
