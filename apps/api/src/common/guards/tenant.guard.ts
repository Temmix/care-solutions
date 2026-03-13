import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }

    // SUPER_ADMIN and TENANT_ADMIN can switch tenant context via header
    if (user.role === 'SUPER_ADMIN' || user.role === 'TENANT_ADMIN') {
      const headerTenantId = request.headers['x-tenant-id'];
      request.tenantId = headerTenantId || null;
      return true;
    }

    // Regular users must have a tenantId
    if (!user.tenantId) {
      throw new ForbiddenException('User is not assigned to a tenant');
    }

    request.tenantId = user.tenantId;
    return true;
  }
}
