import {
  Controller,
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
  ) {}

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
