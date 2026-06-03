import { Controller, Get, Inject, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { AuditService } from './audit.service';
import { SearchAuditLogsDto } from './dto';
import { Roles, CurrentTenant, CurrentUser } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

@Controller('audit')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  @Get('logs')
  @Roles(Role.ADMIN, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  searchLogs(@Query() dto: SearchAuditLogsDto, @CurrentTenant() tenantId: string) {
    return this.auditService.search(dto, tenantId);
  }

  @Get('logs/export')
  @Roles(Role.ADMIN, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  async exportLogs(
    @Query() dto: SearchAuditLogsDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const csv = await this.auditService.exportCsv(dto, tenantId, user.id);
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-${date}.csv"`);
    return csv;
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
