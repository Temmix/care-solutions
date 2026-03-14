import { Injectable, Inject, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // request.role is set by TenantGuard (from membership or globalRole)
    const role = request.role ?? request.user?.globalRole;

    // SUPER_ADMIN bypasses all role checks
    if (role === 'SUPER_ADMIN') {
      return true;
    }

    // TENANT_ADMIN inherits ADMIN privileges (but not SUPER_ADMIN)
    if (role === 'TENANT_ADMIN') {
      return requiredRoles.some((r) => r === 'TENANT_ADMIN' || r === 'ADMIN');
    }

    return requiredRoles.some((r) => r === role);
  }
}
