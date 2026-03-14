import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from '../src/common/guards/tenant.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { SubscriptionGuard } from '../src/common/guards/subscription.guard';

// ── Helpers ──────────────────────────────────────────

const createMockContext = (request: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  }) as unknown as ExecutionContext;

// ── TenantGuard ──────────────────────────────────────

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let prisma: { userTenantMembership: { findFirst: jest.Mock } };

  beforeEach(() => {
    prisma = {
      userTenantMembership: { findFirst: jest.fn() },
    };
    guard = new TenantGuard(prisma as any);
  });

  it('should throw ForbiddenException when no user is present', async () => {
    const ctx = createMockContext({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('No authenticated user');
  });

  // ── SUPER_ADMIN / TENANT_ADMIN bypass ──

  it('should set tenantId from header for SUPER_ADMIN without membership lookup', async () => {
    const request: Record<string, unknown> = {
      user: { id: 'u1', globalRole: 'SUPER_ADMIN' },
      headers: { 'x-tenant-id': 'tenant-123' },
    };
    const ctx = createMockContext(request);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.tenantId).toBe('tenant-123');
    expect(request.role).toBe('SUPER_ADMIN');
    expect(prisma.userTenantMembership.findFirst).not.toHaveBeenCalled();
  });

  it('should set tenantId to null for SUPER_ADMIN with no x-tenant-id header', async () => {
    const request: Record<string, unknown> = {
      user: { id: 'u1', globalRole: 'SUPER_ADMIN' },
      headers: {},
    };
    const ctx = createMockContext(request);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.tenantId).toBeNull();
    expect(request.role).toBe('SUPER_ADMIN');
  });

  it('should set tenantId from header for TENANT_ADMIN without membership lookup', async () => {
    const request: Record<string, unknown> = {
      user: { id: 'u2', globalRole: 'TENANT_ADMIN' },
      headers: { 'x-tenant-id': 'tenant-789' },
    };
    const ctx = createMockContext(request);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.tenantId).toBe('tenant-789');
    expect(request.role).toBe('TENANT_ADMIN');
    expect(prisma.userTenantMembership.findFirst).not.toHaveBeenCalled();
  });

  it('should set tenantId to null for TENANT_ADMIN with no x-tenant-id header', async () => {
    const request: Record<string, unknown> = {
      user: { id: 'u2', globalRole: 'TENANT_ADMIN' },
      headers: {},
    };
    const ctx = createMockContext(request);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.tenantId).toBeNull();
  });

  // ── Regular users: membership-based ──

  it('should throw when regular user has no x-tenant-id header', async () => {
    const request: Record<string, unknown> = {
      user: { id: 'u3', globalRole: 'CARER' },
      headers: {},
    };
    const ctx = createMockContext(request);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('No tenant context');
  });

  it('should throw when regular user has no active membership for requested tenant', async () => {
    prisma.userTenantMembership.findFirst.mockResolvedValue(null);
    const request: Record<string, unknown> = {
      user: { id: 'u3', globalRole: 'CARER' },
      headers: { 'x-tenant-id': 'tenant-999' },
    };
    const ctx = createMockContext(request);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('You do not have access to this tenant');
  });

  it('should set tenantId and role from membership for regular user', async () => {
    prisma.userTenantMembership.findFirst.mockResolvedValue({
      id: 'mem-1',
      userId: 'u3',
      organizationId: 'tenant-100',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    const request: Record<string, unknown> = {
      user: { id: 'u3', globalRole: 'CARER' },
      headers: { 'x-tenant-id': 'tenant-100' },
    };
    const ctx = createMockContext(request);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.tenantId).toBe('tenant-100');
    expect(request.role).toBe('ADMIN');
    expect(prisma.userTenantMembership.findFirst).toHaveBeenCalledWith({
      where: { userId: 'u3', organizationId: 'tenant-100', status: 'ACTIVE' },
    });
  });

  it('should query with correct filters for membership lookup', async () => {
    prisma.userTenantMembership.findFirst.mockResolvedValue({
      id: 'mem-2',
      userId: 'u4',
      organizationId: 'tenant-200',
      role: 'NURSE',
      status: 'ACTIVE',
    });
    const request: Record<string, unknown> = {
      user: { id: 'u4', globalRole: 'CARER' },
      headers: { 'x-tenant-id': 'tenant-200' },
    };
    const ctx = createMockContext(request);

    await guard.canActivate(ctx);

    expect(prisma.userTenantMembership.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'u4',
        organizationId: 'tenant-200',
        status: 'ACTIVE',
      },
    });
  });
});

// ── RolesGuard ───────────────────────────────────────

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  });

  it('should return true when no roles are required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    const ctx = createMockContext({ role: 'CLINICIAN' });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should return true when required roles is null', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);
    const ctx = createMockContext({ role: 'CLINICIAN' });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should use request.role (set by TenantGuard) for role checks', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN']);
    // request.role is set by TenantGuard from membership
    const ctx = createMockContext({ role: 'ADMIN', user: { globalRole: 'CARER' } });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should fall back to user.globalRole when request.role is not set', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['SUPER_ADMIN']);
    const ctx = createMockContext({ user: { globalRole: 'SUPER_ADMIN' } });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should return true for SUPER_ADMIN regardless of required roles', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['CLINICIAN']);
    const ctx = createMockContext({ role: 'SUPER_ADMIN' });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow TENANT_ADMIN when ADMIN is in required roles', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN']);
    const ctx = createMockContext({ role: 'TENANT_ADMIN' });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow TENANT_ADMIN when TENANT_ADMIN is explicitly required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['TENANT_ADMIN']);
    const ctx = createMockContext({ role: 'TENANT_ADMIN' });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should reject TENANT_ADMIN when only SUPER_ADMIN is required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['SUPER_ADMIN']);
    const ctx = createMockContext({ role: 'TENANT_ADMIN' });

    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should reject TENANT_ADMIN when only clinical roles are required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['CLINICIAN', 'NURSE']);
    const ctx = createMockContext({ role: 'TENANT_ADMIN' });

    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should return true when user has a matching role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN', 'CLINICIAN']);
    const ctx = createMockContext({ role: 'CLINICIAN' });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should return false when user does not have a matching role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN', 'CLINICIAN']);
    const ctx = createMockContext({ role: 'PATIENT' });

    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should return false when no role is present at all', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN']);
    const ctx = createMockContext({});

    expect(guard.canActivate(ctx)).toBe(false);
  });
});

// ── SubscriptionGuard ────────────────────────────────

describe('SubscriptionGuard', () => {
  let guard: SubscriptionGuard;
  let prisma: { subscription: { findUnique: jest.Mock } };
  let reflector: Reflector;

  beforeEach(() => {
    prisma = {
      subscription: { findUnique: jest.fn() },
    };
    reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
    guard = new SubscriptionGuard(prisma as any, reflector);
  });

  it('should allow SUPER_ADMIN to bypass subscription check (via request.role)', async () => {
    const request = { role: 'SUPER_ADMIN', user: { id: 'u1' }, tenantId: 'tenant-1' };
    const ctx = createMockContext(request);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
  });

  it('should allow TENANT_ADMIN to bypass subscription check (via request.role)', async () => {
    const request = { role: 'TENANT_ADMIN', user: { id: 'u2' }, tenantId: 'tenant-1' };
    const ctx = createMockContext(request);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
  });

  it('should fall back to user.globalRole for admin bypass', async () => {
    const request = { user: { id: 'u1', globalRole: 'SUPER_ADMIN' }, tenantId: 'tenant-1' };
    const ctx = createMockContext(request);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when no tenantId', async () => {
    const request: Record<string, unknown> = { role: 'ADMIN', user: { id: 'u3' } };
    const ctx = createMockContext(request);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('No tenant context');
  });

  it('should throw ForbiddenException when no subscription exists', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);
    const request = { role: 'ADMIN', user: { id: 'u3' }, tenantId: 'tenant-1' };
    const ctx = createMockContext(request);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('No active subscription');
  });

  it('should allow access when subscription is ACTIVE', async () => {
    const sub = { status: 'ACTIVE', tier: 'STARTER' };
    prisma.subscription.findUnique.mockResolvedValue(sub);
    const request: Record<string, unknown> = {
      role: 'ADMIN',
      user: { id: 'u3' },
      tenantId: 'tenant-1',
    };
    const ctx = createMockContext(request);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(request.subscription).toEqual(sub);
  });

  it('should allow access when subscription is TRIALING', async () => {
    const sub = { status: 'TRIALING', tier: 'PROFESSIONAL' };
    prisma.subscription.findUnique.mockResolvedValue(sub);
    const request: Record<string, unknown> = {
      role: 'ADMIN',
      user: { id: 'u3' },
      tenantId: 'tenant-1',
    };
    const ctx = createMockContext(request);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should reject CANCELED subscription', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ status: 'CANCELED', tier: 'STARTER' });
    const request = { role: 'ADMIN', user: { id: 'u3' }, tenantId: 'tenant-1' };
    const ctx = createMockContext(request);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should reject PAST_DUE subscription with descriptive message', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ status: 'PAST_DUE', tier: 'STARTER' });
    const request = { role: 'ADMIN', user: { id: 'u3' }, tenantId: 'tenant-1' };
    const ctx = createMockContext(request);

    await expect(guard.canActivate(ctx)).rejects.toThrow('past_due');
  });

  it('should query subscription by tenantId', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ status: 'ACTIVE', tier: 'STARTER' });
    const request = { role: 'ADMIN', user: { id: 'u3' }, tenantId: 'tenant-42' };
    const ctx = createMockContext(request);

    await guard.canActivate(ctx);

    expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
      where: { organizationId: 'tenant-42' },
    });
  });
});
