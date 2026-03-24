import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { AuditService } from './audit.service';
import { SearchAuditLogsDto } from './dto';
import { Roles, CurrentTenant } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@Controller('audit')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  @Get('logs')
  @Roles(Role.ADMIN, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  searchLogs(@Query() dto: SearchAuditLogsDto, @CurrentTenant() tenantId: string) {
    return this.auditService.search(dto, tenantId);
  }

  @Get('compliance')
  @Roles(Role.ADMIN, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  getCompliance(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getComplianceSummary(tenantId, startDate, endDate);
  }
}
