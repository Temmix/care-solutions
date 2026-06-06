import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { TenantPurgeService, type PurgeCandidate, type PurgeResult } from './tenant-purge.service';
import { ExecutePurgeDto } from './dto/execute-purge.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

/**
 * Platform-level terminated-tenant data retention. SUPER_ADMIN only
 * (cross-tenant) — no TenantGuard; RolesGuard falls back to the global role.
 */
@Controller('tenant-purge')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class TenantPurgeController {
  constructor(@Inject(TenantPurgeService) private readonly tenantPurge: TenantPurgeService) {}

  /** Tenants past the post-termination grace window, eligible for purge. */
  @Get('candidates')
  listCandidates(): Promise<PurgeCandidate[]> {
    return this.tenantPurge.listPurgeCandidates();
  }

  /**
   * Hard-delete a terminated tenant's Customer Data. Requires the feature flag,
   * the tenant id echoed as confirmation, and a reason. Pass `dryRun: true` to
   * preview the impact. Audit-logged.
   */
  @Post(':tenantId/execute')
  @HttpCode(HttpStatus.OK)
  executePurge(
    @Param('tenantId') tenantId: string,
    @Body() dto: ExecutePurgeDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PurgeResult> {
    return this.tenantPurge.executePurge(
      tenantId,
      dto.confirmation,
      dto.reason,
      user.id,
      dto.dryRun ?? false,
    );
  }
}
