import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const ROUTE_TEMPLATE_RE = /^\/[a-zA-Z0-9/:_-]{0,100}$/;

export class WebVitalDto {
  @IsIn(['web-vital'])
  kind!: 'web-vital';

  /**
   * Route TEMPLATE only — the frontend strips dynamic segments before sending.
   * Server-side regex rejects payloads that look like raw paths (UUID, digits)
   * to prevent cardinality explosion + PII leakage.
   */
  @IsString()
  @Matches(ROUTE_TEMPLATE_RE, { message: 'page must be a route template (no IDs or digits)' })
  page!: string;

  @IsEnum(['LCP', 'FID', 'INP', 'CLS', 'TTFB', 'FCP'])
  metric!: 'LCP' | 'FID' | 'INP' | 'CLS' | 'TTFB' | 'FCP';

  @IsNumber()
  @Min(0)
  @Max(60_000)
  value!: number;

  @IsEnum(['good', 'needs-improvement', 'poor'])
  rating!: 'good' | 'needs-improvement' | 'poor';
}

export class JsErrorDto {
  @IsIn(['js-error'])
  kind!: 'js-error';

  @IsString()
  @Matches(ROUTE_TEMPLATE_RE, { message: 'page must be a route template (no IDs or digits)' })
  page!: string;

  /**
   * Error message + stack are LOGGED (so we can debug) but never enter
   * Prometheus labels — only the count + page do.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  stack?: string;
}
