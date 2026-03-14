import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }

    // SUPER_ADMIN and TENANT_ADMIN can switch tenant context via header (no membership needed)
    if (user.globalRole === 'SUPER_ADMIN' || user.globalRole === 'TENANT_ADMIN') {
      const headerTenantId = request.headers['x-tenant-id'];
      request.tenantId = headerTenantId || null;
      request.role = user.globalRole;
      return true;
    }

    // Regular users: must provide X-Tenant-Id and have an active membership
    const headerTenantId = request.headers['x-tenant-id'];
    if (!headerTenantId) {
      throw new ForbiddenException('No tenant context. Please select a tenant.');
    }

    const membership = await this.prisma.userTenantMembership.findFirst({
      where: {
        userId: user.id,
        organizationId: headerTenantId,
        status: 'ACTIVE',
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this tenant.');
    }

    request.tenantId = headerTenantId;
    request.role = membership.role;
    return true;
  }
}
