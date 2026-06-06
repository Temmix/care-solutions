import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ChcService } from './chc.service';
import {
  CreateChcCaseDto,
  UpdateChcScreeningDto,
  UpdateChcDomainScoreDto,
  AddPanelMemberDto,
  RecordChcDecisionDto,
  SetupCarePackageDto,
  AddChcNoteDto,
  SearchChcCasesDto,
} from './dto';
import { Roles, CurrentUser, CurrentTenant, Audit, ClinicalData } from '../../common/decorators';
import { RolesGuard, TenantGuard, ClinicalAccessGuard } from '../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

@Controller('chc/cases')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard, ClinicalAccessGuard)
@ClinicalData()
export class ChcController {
  constructor(@Inject(ChcService) private chcService: ChcService) {}

  @Post()
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  create(
    @Body() dto: CreateChcCaseDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.chcService.createCase(dto, user.id, tenantId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  search(@Query() dto: SearchChcCasesDto, @CurrentTenant() tenantId: string) {
    return this.chcService.searchCases(dto, tenantId);
  }

  @Get('due-for-review')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  getDueForReview(@CurrentTenant() tenantId: string) {
    return this.chcService.getDueForReview(tenantId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  @Audit({ resource: 'ChcCase' })
  getCase(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.chcService.getCase(id, tenantId);
  }

  @Patch(':id/screening')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  updateScreening(
    @Param('id') id: string,
    @Body() dto: UpdateChcScreeningDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.chcService.updateScreening(id, dto, user.id, tenantId);
  }

  @Post(':id/domain-scores')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  upsertDomainScore(
    @Param('id') id: string,
    @Body() dto: UpdateChcDomainScoreDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.chcService.upsertDomainScore(id, dto, user.id, tenantId);
  }

  @Get(':id/domain-scores')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  @Audit({ resource: 'ChcCase', action: 'VIEW_DOMAIN_SCORES' })
  getDomainScores(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.chcService.getDomainScores(id, tenantId);
  }

  @Post(':id/panel-members')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  addPanelMember(
    @Param('id') id: string,
    @Body() dto: AddPanelMemberDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.chcService.addPanelMember(id, dto, user.id, tenantId);
  }

  @Delete(':id/panel-members/:memberId')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  removePanelMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.chcService.removePanelMember(id, memberId, user.id, tenantId);
  }

  @Post(':id/decision')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  recordDecision(
    @Param('id') id: string,
    @Body() dto: RecordChcDecisionDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.chcService.recordDecision(id, dto, user.id, tenantId);
  }

  @Post(':id/care-package')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  setupCarePackage(
    @Param('id') id: string,
    @Body() dto: SetupCarePackageDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.chcService.setupCarePackage(id, dto, user.id, tenantId);
  }

  @Post(':id/annual-review')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  triggerAnnualReview(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.chcService.triggerAnnualReview(id, user.id, tenantId);
  }

  @Post(':id/close')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  closeCase(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.chcService.closeCase(id, user.id, tenantId);
  }

  @Post(':id/notes')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  addNote(
    @Param('id') id: string,
    @Body() dto: AddChcNoteDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.chcService.addNote(id, dto, user.id, tenantId);
  }
}
