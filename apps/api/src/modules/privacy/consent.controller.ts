import { Controller, Get, Put, Body, Param, UseGuards, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ConsentService } from './consent.service';
import { UpsertProcessingBasisDto } from './dto/upsert-processing-basis.dto';
import { UpsertConsentDto } from './dto/upsert-consent.dto';
import { Roles, CurrentUser, CurrentTenant } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

/**
 * Lawful-basis and consent records for a patient (UK GDPR Art. 6/9 + consents).
 * Recordable by clinical staff and admins (SUPER_ADMIN bypasses RolesGuard).
 */
@Controller('privacy/patients/:id')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class ConsentController {
  constructor(@Inject(ConsentService) private readonly consent: ConsentService) {}

  @Get('processing-bases')
  @Roles(Role.CLINICIAN, Role.NURSE, Role.ADMIN, Role.TENANT_ADMIN)
  listProcessingBases(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.consent.listProcessingBases(id, tenantId);
  }

  @Put('processing-bases')
  @Roles(Role.CLINICIAN, Role.NURSE, Role.ADMIN, Role.TENANT_ADMIN)
  upsertProcessingBasis(
    @Param('id') id: string,
    @Body() dto: UpsertProcessingBasisDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.consent.upsertProcessingBasis(id, dto, user.id, tenantId);
  }

  @Get('consents')
  @Roles(Role.CLINICIAN, Role.NURSE, Role.ADMIN, Role.TENANT_ADMIN)
  listConsents(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.consent.listConsents(id, tenantId);
  }

  @Put('consents')
  @Roles(Role.CLINICIAN, Role.NURSE, Role.ADMIN, Role.TENANT_ADMIN)
  upsertConsent(
    @Param('id') id: string,
    @Body() dto: UpsertConsentDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.consent.upsertConsent(id, dto, user.id, tenantId);
  }
}
