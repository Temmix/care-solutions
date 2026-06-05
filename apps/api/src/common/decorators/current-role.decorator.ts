import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/** The caller's effective role for the current tenant (set by TenantGuard). */
export const CurrentRole = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request & { role?: string }>();
  return request.role;
});
