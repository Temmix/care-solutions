import { Controller, Get, Headers, Inject, UnauthorizedException, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { MetricsService } from './metrics.service';

/**
 * GET /metrics — Prometheus scrape endpoint.
 *
 * Protected by HTTP Basic Auth via the `PROMETHEUS_SCRAPE_TOKEN` env var.
 * Both the username and password must match (we use `prometheus` as the
 * username convention; the token is the password). If the env var is unset
 * the endpoint refuses every request — fail-closed.
 */
@Controller('metrics')
export class MetricsController {
  constructor(
    @Inject(MetricsService) private metrics: MetricsService,
    @Inject(ConfigService) private config: ConfigService,
  ) {}

  @Get()
  async scrape(
    @Headers('authorization') auth: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const expected = this.config.get<string>('PROMETHEUS_SCRAPE_TOKEN');
    if (!expected || !this.isAuthorized(auth, expected)) {
      throw new UnauthorizedException();
    }
    res.setHeader('Content-Type', this.metrics.contentType());
    res.send(await this.metrics.render());
  }

  private isAuthorized(auth: string | undefined, expectedToken: string): boolean {
    if (!auth || !auth.startsWith('Basic ')) return false;
    const decoded = Buffer.from(auth.slice('Basic '.length), 'base64').toString('utf8');
    const [, password] = decoded.split(':');
    if (password === undefined) return false;
    // Constant-time comparison to avoid timing attacks
    if (password.length !== expectedToken.length) return false;
    let mismatch = 0;
    for (let i = 0; i < password.length; i++) {
      mismatch |= password.charCodeAt(i) ^ expectedToken.charCodeAt(i);
    }
    return mismatch === 0;
  }
}
