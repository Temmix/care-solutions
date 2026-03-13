import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { CurrentTenant } from '../../../common/decorators';
import { TenantGuard } from '../../../common/guards';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class DashboardController {
  constructor(@Inject(DashboardService) private dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@CurrentTenant() tenantId: string) {
    return this.dashboardService.getStats(tenantId);
  }
}
