import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from '../src/common/guards/tenant.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { SubscriptionGuard } from '../src/common/guards/subscription.guard';

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  const createMockContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  it('should throw ForbiddenException when no user is present', () => {
    const ctx = createMockContext({});
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('No authenticated user');
  });

  it('should set tenantId from header for SUPER_ADMIN', () => {
    const request: Record<string, unknown> = {
      user: { role: 'SUPER_ADMIN' },
      headers: { 'x-tenant-id': 'tenant-123' },
    };
    const ctx = createMockContext(request);

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.tenantId).toBe('tenant-123');
  });

  it('should set tenantId to null for SUPER_ADMIN with no x-tenant-id header', () => {
    const request: Record<string, unknown> = {
      user: { role: 'SUPER_ADMIN' },
      headers: {},
    };
    const ctx = createMockContext(request);

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.tenantId).toBeNull();
  });

  it('should throw ForbiddenException for regular user without tenantId', () => {
    const request = {
      user: { role: 'CLINICIAN' },
    };
    const ctx = createMockContext(request);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('User is not assigned to a tenant');
  });

  it('should set tenantId from user for regular user with tenantId', () => {
    const request: Record<string, unknown> = {
      user: { role: 'CLINICIAN', tenantId: 'user-tenant-456' },
    };
    const ctx = createMockContext(request);

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.tenantId).toBe('user-tenant-456');
  });
});

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  it('should return true when no roles are required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    const ctx = createMockContext({ user: { role: 'CLINICIAN' } });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should return true when required roles is null', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);
    const ctx = createMockContext({ user: { role: 'CLINICIAN' } });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should return true for SUPER_ADMIN regardless of required roles', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN']);
    const ctx = createMockContext({ user: { role: 'SUPER_ADMIN' } });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should return true when user has a matching role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN', 'CLINICIAN']);
    const ctx = createMockContext({ user: { role: 'CLINICIAN' } });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should return false when user does not have a matching role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN', 'CLINICIAN']);
    const ctx = createMockContext({ user: { role: 'PATIENT' } });

    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should return false when user is undefined', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN']);
    const ctx = createMockContext({});

    expect(guard.canActivate(ctx)).toBe(false);
  });
});

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

  const createMockContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  it('should allow SUPER_ADMIN to bypass subscription check', async () => {
    const request = { user: { role: 'SUPER_ADMIN' }, tenantId: 'tenant-1' };
    const ctx = createMockContext(request);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when no tenantId', async () => {
    const request: Record<string, unknown> = { user: { role: 'ADMIN' } };
    const ctx = createMockContext(request);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when no subscription exists', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);
    const request = { user: { role: 'ADMIN' }, tenantId: 'tenant-1' };
    const ctx = createMockContext(request);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('No active subscription');
  });

  it('should throw ForbiddenException when subscription is canceled', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      status: 'CANCELED',
      tier: 'STARTER',
    });
    const request = { user: { role: 'ADMIN' }, tenantId: 'tenant-1' };
    const ctx = createMockContext(request);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access when subscription is ACTIVE', async () => {
    const sub = { status: 'ACTIVE', tier: 'STARTER' };
    prisma.subscription.findUnique.mockResolvedValue(sub);
    const request: Record<string, unknown> = {
      user: { role: 'ADMIN' },
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
      user: { role: 'ADMIN' },
      tenantId: 'tenant-1',
    };
    const ctx = createMockContext(request);

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should reject PAST_DUE subscription', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      status: 'PAST_DUE',
      tier: 'STARTER',
    });
    const request = { user: { role: 'ADMIN' }, tenantId: 'tenant-1' };
    const ctx = createMockContext(request);

    await expect(guard.canActivate(ctx)).rejects.toThrow('past_due');
  });
});
