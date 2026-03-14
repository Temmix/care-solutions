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
import { MedicationsService } from './medications.service';
import {
  CreateMedicationDto,
  UpdateMedicationDto,
  CreatePrescriptionDto,
  UpdatePrescriptionDto,
  CreateAdministrationDto,
  SearchPrescriptionsDto,
} from './dto';
import { Roles, CurrentUser, CurrentTenant } from '../../../common/decorators';
import { RolesGuard, TenantGuard } from '../../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

@Controller('medications')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class MedicationsController {
  constructor(@Inject(MedicationsService) private medicationsService: MedicationsService) {}

  // ── Medication Catalogue ──────────────────────────────

  @Post('catalogue')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  createMedication(@Body() dto: CreateMedicationDto, @CurrentTenant() tenantId: string | null) {
    return this.medicationsService.createMedication(dto, tenantId);
  }

  @Patch('catalogue/:id')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  updateMedication(
    @Param('id') id: string,
    @Body() dto: UpdateMedicationDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.medicationsService.updateMedication(id, dto, tenantId);
  }

  @Get('catalogue')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  findAllMedications(@CurrentTenant() tenantId: string | null) {
    return this.medicationsService.findAllMedications(tenantId);
  }

  // ── Prescriptions (MedicationRequest) ─────────────────

  @Post('prescriptions')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  createPrescription(
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.medicationsService.createPrescription(dto, user.id, tenantId);
  }

  @Get('prescriptions')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  findAllPrescriptions(
    @Query() dto: SearchPrescriptionsDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.medicationsService.findAllPrescriptions(dto, tenantId);
  }

  @Get('prescriptions/:id')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  findOnePrescription(@Param('id') id: string, @CurrentTenant() tenantId: string | null) {
    return this.medicationsService.findOnePrescription(id, tenantId);
  }

  @Patch('prescriptions/:id')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  updatePrescription(
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.medicationsService.updatePrescription(id, dto, user.id, tenantId);
  }

  // ── Administration ────────────────────────────────────

  @Post('administrations')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  recordAdministration(
    @Body() dto: CreateAdministrationDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.medicationsService.recordAdministration(dto, user.id, tenantId);
  }

  @Get('prescriptions/:id/administrations')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  getAdministrations(
    @Param('id') requestId: string,
    @CurrentTenant() tenantId: string | null,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.medicationsService.getAdministrations(requestId, tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
