import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { PatientFlowService } from './patient-flow.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
  CreateBedDto,
  AdmitPatientDto,
  TransferDto,
  DischargeDto,
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
export class PatientFlowController {
  constructor(@Inject(PatientFlowService) private patientFlowService: PatientFlowService) {}

  // ── Locations ───────────────────────────────────────

  @Post('locations')
  @Roles(Role.ADMIN)
  createLocation(@Body() dto: CreateLocationDto, @CurrentTenant() tenantId: string | null) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.patientFlowService.createLocation(dto, tenantId);
  }

  @Get('locations')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  listLocations(@CurrentTenant() tenantId: string | null) {
    return this.patientFlowService.listLocations(tenantId);
  }

  @Patch('locations/:id')
  @Roles(Role.ADMIN)
  updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.patientFlowService.updateLocation(id, dto, tenantId);
  }

  // ── Beds ────────────────────────────────────────────

  @Post('beds')
  @Roles(Role.ADMIN)
  createBed(@Body() dto: CreateBedDto, @CurrentTenant() tenantId: string | null) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.patientFlowService.createBed(dto, tenantId);
  }

  @Get('beds')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  listBeds(
    @CurrentTenant() tenantId: string | null,
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
  ) {
    return this.patientFlowService.listBeds(tenantId, { locationId, status });
  }

  @Patch('beds/:id')
  @Roles(Role.ADMIN)
  updateBed(
    @Param('id') id: string,
    @Body() body: { status?: string; notes?: string },
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.patientFlowService.updateBed(id, body, tenantId);
  }

  // ── Encounters ──────────────────────────────────────

  @Post('encounters/admit')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  admit(
    @Body() dto: AdmitPatientDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.patientFlowService.admit(dto, user.id, tenantId);
  }

  @Get('encounters')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  listEncounters(
    @CurrentTenant() tenantId: string | null,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.patientFlowService.listEncounters(tenantId, {
      status,
      patientId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('encounters/:id')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  getEncounter(@Param('id') id: string, @CurrentTenant() tenantId: string | null) {
    return this.patientFlowService.getEncounter(id, tenantId);
  }

  @Post('encounters/:id/transfer')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  transfer(
    @Param('id') id: string,
    @Body() dto: TransferDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.patientFlowService.transfer(id, dto, user.id, tenantId);
  }

  @Post('encounters/:id/discharge')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  discharge(
    @Param('id') id: string,
    @Body() dto: DischargeDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.patientFlowService.discharge(id, dto, user.id, tenantId);
  }
}
