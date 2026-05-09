import { Body, Controller, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { RumService } from './rum.service';
import { WebVitalDto, JsErrorDto } from './dto/rum-payload.dto';

/**
 * Real-User Monitoring beacon receiver. The frontend posts here via
 * `navigator.sendBeacon` for both Web Vitals and uncaught JS errors.
 *
 * Auth: requires JWT. Anonymous beacons are dropped — RUM data is only
 * meaningful when we can correlate to a known user/tenant later if needed.
 */
@Controller('rum')
@UseGuards(AuthGuard('jwt'))
export class RumController {
  constructor(@Inject(RumService) private rum: RumService) {}

  @Post('web-vital')
  webVital(@Body() body: WebVitalDto): { received: true } {
    this.rum.recordWebVital(body);
    return { received: true };
  }

  @Post('js-error')
  jsError(@Body() body: JsErrorDto, @Req() req: Request): { received: true } {
    const user = req.user as { id?: string } | undefined;
    const tenantId = (req as unknown as Record<string, unknown>).tenantId as string | undefined;
    this.rum.recordJsError(body, user?.id, tenantId);
    return { received: true };
  }
}
