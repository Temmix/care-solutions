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
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { CarePlansService } from './care-plans.service';
import {
  CreateCarePlanDto,
  UpdateCarePlanDto,
  CreateGoalDto,
  UpdateGoalDto,
  CreateActivityDto,
  UpdateActivityDto,
  CreateNoteDto,
  SearchCarePlansDto,
} from './dto';
import { Roles, CurrentUser, CurrentTenant } from '../../../common/decorators';
import { RolesGuard, TenantGuard } from '../../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

@Controller('care-plans')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class CarePlansController {
  constructor(@Inject(CarePlansService) private carePlansService: CarePlansService) {}

  // ── Care Plans ─────────────────────────────────────────

  @Post()
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  create(
    @Body() dto: CreateCarePlanDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.carePlansService.create(dto, user.id, tenantId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  findAll(@Query() dto: SearchCarePlansDto, @CurrentTenant() tenantId: string | null) {
    return this.carePlansService.findAll(dto, tenantId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string | null) {
    return this.carePlansService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCarePlanDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.carePlansService.update(id, dto, user.id, tenantId);
  }

  // ── Goals ──────────────────────────────────────────────

  @Post(':id/goals')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  addGoal(
    @Param('id') carePlanId: string,
    @Body() dto: CreateGoalDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.carePlansService.addGoal(carePlanId, dto, user.id, tenantId);
  }

  @Patch(':id/goals/:goalId')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  updateGoal(
    @Param('id') carePlanId: string,
    @Param('goalId') goalId: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.carePlansService.updateGoal(carePlanId, goalId, dto, user.id, tenantId);
  }

  @Delete(':id/goals/:goalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  removeGoal(
    @Param('id') carePlanId: string,
    @Param('goalId') goalId: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.carePlansService.removeGoal(carePlanId, goalId, user.id, tenantId);
  }

  // ── Activities ─────────────────────────────────────────

  @Post(':id/activities')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  addActivity(
    @Param('id') carePlanId: string,
    @Body() dto: CreateActivityDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.carePlansService.addActivity(carePlanId, dto, user.id, tenantId);
  }

  @Patch(':id/activities/:activityId')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  updateActivity(
    @Param('id') carePlanId: string,
    @Param('activityId') activityId: string,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.carePlansService.updateActivity(carePlanId, activityId, dto, user.id, tenantId);
  }

  @Delete(':id/activities/:activityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  removeActivity(
    @Param('id') carePlanId: string,
    @Param('activityId') activityId: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.carePlansService.removeActivity(carePlanId, activityId, user.id, tenantId);
  }

  // ── Notes ──────────────────────────────────────────────

  @Post(':id/notes')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  addNote(
    @Param('id') carePlanId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.carePlansService.addNote(carePlanId, dto, user.id, tenantId);
  }

  @Get(':id/notes')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  getNotes(
    @Param('id') carePlanId: string,
    @CurrentTenant() tenantId: string | null,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.carePlansService.getNotes(carePlanId, tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
