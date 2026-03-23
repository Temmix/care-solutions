import { Controller, Get, Inject, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto';
import { Roles, CurrentTenant } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  @Get('patient-census')
  async patientCensus(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.reportsService.patientCensus(tenantId, query.startDate, query.endDate);
    if (query.format === 'csv') {
      return this.sendCsv(res, 'patient-census', data.admissionsOverTime, [
        'date',
        'admissions',
        'discharges',
      ]);
    }
    return data;
  }

  @Get('bed-occupancy')
  async bedOccupancy(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.reportsService.bedOccupancy(tenantId);
    if (query.format === 'csv') {
      return this.sendCsv(res, 'bed-occupancy', data.byLocation, [
        'locationName',
        'total',
        'occupied',
        'rate',
      ]);
    }
    return data;
  }

  @Get('workforce-compliance')
  async workforceCompliance(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.reportsService.workforceCompliance(
      tenantId,
      query.startDate,
      query.endDate,
    );
    if (query.format === 'csv') {
      return this.sendCsv(res, 'workforce-compliance', data.upcomingGaps, ['date', 'shiftType']);
    }
    return data;
  }

  @Get('care-plan-reviews')
  async carePlanReviews(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.reportsService.carePlanReviews(tenantId);
    if (query.format === 'csv') {
      return this.sendCsv(res, 'care-plan-reviews', data.overdueReviews, [
        'id',
        'title',
        'patientName',
        'nextReviewDate',
        'daysOverdue',
      ]);
    }
    return data;
  }

  @Get('chc-pipeline')
  async chcPipeline(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.reportsService.chcPipeline(tenantId);
    if (query.format === 'csv') {
      return this.sendCsv(res, 'chc-pipeline', data.byStatus, ['status', 'count']);
    }
    return data;
  }

  @Get('virtual-wards-summary')
  async virtualWardsSummary(
    @CurrentTenant() tenantId: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.reportsService.virtualWardsSummary(tenantId);
    if (query.format === 'csv') {
      return this.sendCsv(res, 'virtual-wards-summary', data.alertsBySeverity, [
        'severity',
        'count',
      ]);
    }
    return data;
  }

  private sendCsv(
    res: Response,
    filename: string,
    data: Record<string, unknown>[],
    columns: string[],
  ): string {
    const csv = this.reportsService.toCsv(data, columns);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return csv;
  }
}
