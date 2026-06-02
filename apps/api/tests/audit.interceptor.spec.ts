import { ExecutionContext, CallHandler } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AuditInterceptor } from '../src/common/interceptors/audit.interceptor';

// ── Helpers ──────────────────────────────────────────

const createContext = (
  request: Record<string, unknown>,
  handler: () => unknown = jest.fn(),
): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => jest.fn(),
  }) as unknown as ExecutionContext;

const createHandler = (value: unknown): CallHandler => ({ handle: () => of(value) });

// ── AuditInterceptor ─────────────────────────────────

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let reflector: { get: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    reflector = { get: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    interceptor = new AuditInterceptor(reflector as any, audit as any);
  });

  it('does not log when the route has no @Audit metadata', async () => {
    reflector.get.mockReturnValue(undefined);
    const ctx = createContext({ user: { id: 'u1' }, tenantId: 't1', params: { id: 'p1' } });

    await lastValueFrom(interceptor.intercept(ctx, createHandler({ ok: true })));

    expect(audit.log).not.toHaveBeenCalled();
  });

  it('logs a VIEW entry with user, tenant and resourceId on success', async () => {
    reflector.get.mockReturnValue({ resource: 'Patient' });
    const request = {
      user: { id: 'u1' },
      tenantId: 't1',
      params: { id: 'p1' },
      route: { path: '/api/patients/:id' },
    };
    const ctx = createContext(request);

    await lastValueFrom(interceptor.intercept(ctx, createHandler({ ok: true })));

    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        action: 'VIEW',
        resource: 'Patient',
        resourceId: 'p1',
        tenantId: 't1',
        metadata: { route: '/api/patients/:id' },
      }),
    );
  });

  it('uses a custom action and idParam from the decorator', async () => {
    reflector.get.mockReturnValue({
      resource: 'CarePlan',
      action: 'VIEW_NOTES',
      idParam: 'carePlanId',
    });
    const request = { user: { id: 'u2' }, tenantId: 't2', params: { carePlanId: 'cp9' } };
    const ctx = createContext(request);

    await lastValueFrom(interceptor.intercept(ctx, createHandler([])));

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VIEW_NOTES',
        resource: 'CarePlan',
        resourceId: 'cp9',
      }),
    );
  });

  it('does not log when there is no authenticated user', async () => {
    reflector.get.mockReturnValue({ resource: 'Patient' });
    const ctx = createContext({ params: { id: 'p1' } });

    await lastValueFrom(interceptor.intercept(ctx, createHandler({})));

    expect(audit.log).not.toHaveBeenCalled();
  });

  it('does not log when the handler errors (no view recorded for 404/403)', async () => {
    reflector.get.mockReturnValue({ resource: 'Patient' });
    const ctx = createContext({ user: { id: 'u1' }, tenantId: 't1', params: { id: 'p1' } });
    const failing: CallHandler = { handle: () => throwError(() => new Error('not found')) };

    await expect(lastValueFrom(interceptor.intercept(ctx, failing))).rejects.toThrow('not found');
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('never blocks the response when audit logging rejects (fire-and-forget)', async () => {
    reflector.get.mockReturnValue({ resource: 'Patient' });
    audit.log.mockRejectedValue(new Error('db down'));
    const ctx = createContext({ user: { id: 'u1' }, tenantId: 't1', params: { id: 'p1' } });

    const result = await lastValueFrom(interceptor.intercept(ctx, createHandler({ ok: true })));

    expect(result).toEqual({ ok: true });
  });
});
