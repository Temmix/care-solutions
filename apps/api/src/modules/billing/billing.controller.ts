import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UseGuards,
  Inject,
  Req,
  Logger,
  RawBodyRequest,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { Roles, CurrentTenant } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(@Inject(BillingService) private billingService: BillingService) {}

  // ── Public: list available plans ──────────────────────

  @Get('plans')
  getPlans() {
    return this.billingService.getPlans();
  }

  // ── Authenticated: subscription info ──────────────────

  @Get('subscription')
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getSubscription(@CurrentTenant() tenantId: string) {
    return this.billingService.getSubscription(tenantId);
  }

  // ── Authenticated: create checkout session ────────────

  @Post('checkout')
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles(Role.ADMIN)
  createCheckout(
    @CurrentTenant() tenantId: string,
    @Body() body: { priceId: string; returnUrl: string },
  ) {
    if (!body.priceId || !body.returnUrl) {
      throw new BadRequestException('priceId and returnUrl are required');
    }
    return this.billingService.createCheckoutSession(tenantId, body.priceId, body.returnUrl);
  }

  // ── Authenticated: create portal session ──────────────

  @Post('portal')
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles(Role.ADMIN)
  createPortal(@CurrentTenant() tenantId: string, @Body() body: { returnUrl: string }) {
    if (!body.returnUrl) {
      throw new BadRequestException('returnUrl is required');
    }
    return this.billingService.createPortalSession(tenantId, body.returnUrl);
  }

  // ── Stripe webhook (no auth, raw body) ────────────────

  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    try {
      const event = this.billingService.constructWebhookEvent(rawBody, signature);
      this.logger.log(`Webhook received: ${event.type} (${event.id})`);
      await this.billingService.handleWebhookEvent(event);
      return { received: true };
    } catch (err) {
      this.logger.error(`Webhook error: ${err instanceof Error ? err.message : err}`);
      throw new BadRequestException('Webhook signature verification failed');
    }
  }
}
