import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CLINICAL_DATA_KEY } from '../decorators';

/**
 * Denies platform administrators (SUPER_ADMIN) access to handlers marked with
 * `@ClinicalData()`.
 *
 * SUPER_ADMIN is a pure platform role: it has no tenant membership and no
 * clinical role, yet it bypasses `@Roles()` in {@link RolesGuard} and can set
 * any `X-Tenant-Id` in {@link TenantGuard}. Without this guard a platform admin
 * could read (or DSAR-export) any tenant's patient records. Legitimate platform
 * operations (tenant verification, trials, billing, user management, tenant
 * purge) are not marked `@ClinicalData()` and are unaffected.
 *
 * Place AFTER AuthGuard/TenantGuard/RolesGuard so `request.user` is populated.
 */
@Injectable()
export class ClinicalAccessGuard implements CanActivate {
  private readonly logger = new Logger(ClinicalAccessGuard.name);

  constructor(@Inject(Reflector) private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isClinical = this.reflector.getAllAndOverride<boolean>(CLINICAL_DATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isClinical) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (request.user?.globalRole === 'SUPER_ADMIN') {
      this.logger.warn(
        `Blocked SUPER_ADMIN clinical-data access: user=${request.user?.id} ` +
          `tenant=${request.tenantId ?? 'none'} ${request.method} ${request.url}`,
      );
      throw new ForbiddenException(
        'Platform administrators do not have access to patient clinical data.',
      );
    }
    return true;
  }
}
