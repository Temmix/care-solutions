import type { Role } from './enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  tenantId: string | null;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role;
  tenantName?: string;
  organizationType?: string;
}
