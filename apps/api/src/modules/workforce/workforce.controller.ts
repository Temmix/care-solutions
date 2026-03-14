import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { WorkforceService } from './workforce.service';
import {
  CreateShiftPatternDto,
  UpdateShiftPatternDto,
  CreateShiftDto,
  AssignShiftDto,
  CreateAvailabilityDto,
} from './dto';
import { Roles, CurrentUser, CurrentTenant } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

@Controller()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class WorkforceController {
  constructor(@Inject(WorkforceService) private workforceService: WorkforceService) {}

  // ── Shift Patterns ──────────────────────────────────

  @Post('shift-patterns')
  @Roles(Role.ADMIN)
  createShiftPattern(@Body() dto: CreateShiftPatternDto, @CurrentTenant() tenantId: string | null) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.workforceService.createShiftPattern(dto, tenantId);
  }

  @Get('shift-patterns')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  listShiftPatterns(@CurrentTenant() tenantId: string | null) {
    return this.workforceService.listShiftPatterns(tenantId);
  }

  @Patch('shift-patterns/:id')
  @Roles(Role.ADMIN)
  updateShiftPattern(
    @Param('id') id: string,
    @Body() dto: UpdateShiftPatternDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.workforceService.updateShiftPattern(id, dto, tenantId);
  }

  @Delete('shift-patterns/:id')
  @Roles(Role.ADMIN)
  deleteShiftPattern(@Param('id') id: string, @CurrentTenant() tenantId: string | null) {
    return this.workforceService.deleteShiftPattern(id, tenantId);
  }

  // ── Shifts ──────────────────────────────────────────

  @Post('shifts')
  @Roles(Role.ADMIN)
  createShift(@Body() dto: CreateShiftDto, @CurrentTenant() tenantId: string | null) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.workforceService.createShift(dto, tenantId);
  }

  @Get('shifts')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  listShifts(
    @CurrentTenant() tenantId: string | null,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workforceService.listShifts(tenantId, {
      from,
      to,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('shifts/:id')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  getShift(@Param('id') id: string, @CurrentTenant() tenantId: string | null) {
    return this.workforceService.getShift(id, tenantId);
  }

  @Patch('shifts/:id')
  @Roles(Role.ADMIN)
  updateShift(
    @Param('id') id: string,
    @Body() body: { status?: string; notes?: string },
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.workforceService.updateShift(id, body, tenantId);
  }

  @Delete('shifts/:id')
  @Roles(Role.ADMIN)
  deleteShift(@Param('id') id: string, @CurrentTenant() tenantId: string | null) {
    return this.workforceService.deleteShift(id, tenantId);
  }

  @Post('shifts/:id/assign')
  @Roles(Role.ADMIN)
  assignShift(
    @Param('id') id: string,
    @Body() dto: AssignShiftDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.workforceService.assignShift(id, dto, tenantId);
  }

  @Delete('shifts/:id/assign/:userId')
  @Roles(Role.ADMIN)
  removeAssignment(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.workforceService.removeAssignment(id, userId, tenantId);
  }

  // ── Availability ────────────────────────────────────

  @Post('availability')
  createAvailability(
    @Body() dto: CreateAvailabilityDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.workforceService.createAvailability(dto, user.id, tenantId);
  }

  @Get('availability')
  @Roles(Role.ADMIN)
  listAvailability(
    @CurrentTenant() tenantId: string | null,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workforceService.listAvailability(tenantId, {
      from,
      to,
      userId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('availability/me')
  getMyAvailability(
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.workforceService.getMyAvailability(user.id, tenantId, { from, to });
  }

  @Delete('availability/:id')
  deleteAvailability(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.workforceService.deleteAvailability(id, user.id);
  }
}
