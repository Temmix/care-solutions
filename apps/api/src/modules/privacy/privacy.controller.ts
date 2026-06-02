import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { PatientAnonymizationService } from './patient-anonymization.service';
import { PatientDsarExportService, type PatientDsarExport } from './patient-dsar-export.service';
import { PrivacySummaryService, type ProcessingActivitiesSummary } from './privacy-summary.service';
import { AnonymisePatientDto } from './dto/anonymise-patient.dto';
import { Roles, CurrentUser, CurrentTenant } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

@Controller('privacy')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class PrivacyController {
  constructor(
    @Inject(PatientAnonymizationService)
    private readonly anonymization: PatientAnonymizationService,
    @Inject(PatientDsarExportService)
    private readonly dsarExport: PatientDsarExportService,
    @Inject(PrivacySummaryService)
    private readonly summary: PrivacySummaryService,
  ) {}

  /**
   * Tenant-level record of processing activities (lawful bases + consents in
   * use). Read-only accountability overview for org admins.
   */
  @Get('processing-summary')
  @Roles(Role.ADMIN, Role.TENANT_ADMIN)
  getProcessingSummary(@CurrentTenant() tenantId: string): Promise<ProcessingActivitiesSummary> {
    return this.summary.getProcessingSummary(tenantId);
  }

  /**
   * Export all of a patient's personal data (GDPR right of access / portability).
   * Restricted to org admins (SUPER_ADMIN bypasses). Audit-logged as EXPORT.
   */
  @Get('patients/:id/export')
  @Roles(Role.ADMIN, Role.TENANT_ADMIN)
  exportPatient(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ): Promise<PatientDsarExport> {
    return this.dsarExport.exportPatient(id, user.id, tenantId, new Date());
  }

  /**
   * Irreversibly anonymise a patient (GDPR right to erasure).
   * Restricted to tenant admins (SUPER_ADMIN bypasses RolesGuard). The body
   * must echo the patient id as a confirmation token and supply a reason.
   */
  @Post('patients/:id/anonymise')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.TENANT_ADMIN)
  anonymisePatient(
    @Param('id') id: string,
    @Body() dto: AnonymisePatientDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ): Promise<{ patientId: string; anonymizedAt: Date }> {
    return this.anonymization.anonymisePatient(id, dto.confirmation, dto.reason, user.id, tenantId);
  }
}
