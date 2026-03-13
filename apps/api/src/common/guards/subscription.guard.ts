import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

export const SUBSCRIPTION_KEY = 'subscription_required';

/**
 * Guard that checks the tenant has an active (or trialing) subscription.
 * SUPER_ADMIN bypasses this check.
 * Apply with @UseGuards(SubscriptionGuard) on controllers/routes that require a paid plan.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(Reflector) private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // SUPER_ADMIN and TENANT_ADMIN bypass subscription checks
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN') {
      return true;
    }

    const tenantId = request.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('No tenant context');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: tenantId },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'No active subscription. Please subscribe to a plan to continue.',
      );
    }

    const activeStatuses = ['ACTIVE', 'TRIALING'];
    if (!activeStatuses.includes(subscription.status)) {
      throw new ForbiddenException(
        `Your subscription is ${subscription.status.toLowerCase()}. Please update your billing to continue.`,
      );
    }

    // Attach subscription to request for downstream use
    request.subscription = subscription;
    return true;
  }
}
