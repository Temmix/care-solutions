import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { TenantPurgeService, type PurgeCandidate } from './tenant-purge.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

/**
 * Platform-level view of tenants whose data is eligible for purge after the
 * post-termination grace window. SUPER_ADMIN only (cross-tenant) — no
 * TenantGuard; RolesGuard falls back to the user's global role.
 */
@Controller('tenant-purge')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class TenantPurgeController {
  constructor(@Inject(TenantPurgeService) private readonly tenantPurge: TenantPurgeService) {}

  @Get('candidates')
  listCandidates(): Promise<PurgeCandidate[]> {
    return this.tenantPurge.listPurgeCandidates();
  }
}
