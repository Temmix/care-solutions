import { Controller, Get, Post, Body, Query, Inject, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ShiftReportsService } from './shift-reports.service';
import { CreateShiftReportDto, ListShiftReportsDto } from './dto';
import {
  Roles,
  CurrentUser,
  CurrentRole,
  CurrentTenant,
  ClinicalData,
} from '../../common/decorators';
import { RolesGuard, TenantGuard, ClinicalAccessGuard } from '../../common/guards';

interface RequestUser {
  id: string;
}

@Controller('shift-reports')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard, ClinicalAccessGuard)
@ClinicalData()
export class ShiftReportsController {
  constructor(@Inject(ShiftReportsService) private readonly service: ShiftReportsService) {}

  @Post()
  @Roles(Role.CLINICIAN, Role.NURSE, Role.CARER)
  create(
    @Body() dto: CreateShiftReportDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.service.createShiftReport(dto, user.id, tenantId);
  }

  /** The worker's currently-open shift + patients/beds they may report on. */
  @Get('context')
  @Roles(Role.CLINICIAN, Role.NURSE, Role.CARER)
  context(@CurrentUser() user: RequestUser, @CurrentTenant() tenantId: string) {
    return this.service.getMyShiftContext(user.id, tenantId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TENANT_ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  list(
    @Query() dto: ListShiftReportsDto,
    @CurrentUser() user: RequestUser,
    @CurrentRole() role: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.service.listShiftReports(dto, user.id, role, tenantId);
  }
}
