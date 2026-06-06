import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AUDIT_KEY, AuditOptions } from '../decorators/audit.decorator';
import { AuditService } from '../../modules/audit/audit.service';

/**
 * Records an audit entry for any route annotated with `@Audit(...)`.
 *
 * Logging happens AFTER the handler succeeds (so 404/403/validation failures
 * are not recorded as views) and is fire-and-forget — a failed audit write
 * never affects the response. Routes without the decorator are ignored.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditOptions | undefined>(AUDIT_KEY, context.getHandler());

    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { id?: string } | undefined;
    const tenantId = (request as unknown as Record<string, unknown>).tenantId as string | undefined;
    const params = request.params as Record<string, string | undefined>;
    const resourceId = params?.[options.idParam ?? 'id'];

    return next.handle().pipe(
      tap(() => {
        const userId = user?.id;
        if (!userId) {
          return;
        }
        // Fire-and-forget; AuditService.log swallows its own errors, and the
        // extra .catch() guards against the response being affected regardless.
        this.audit
          .log({
            userId,
            action: options.action ?? 'VIEW',
            resource: options.resource,
            resourceId,
            tenantId,
            metadata: { route: (request.route as { path?: string } | undefined)?.path },
          })
          .catch(() => {});
      }),
    );
  }
}
