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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { VirtualWardsService } from './virtual-wards.service';
import {
  EnrolPatientDto,
  CreateProtocolDto,
  UpdateProtocolDto,
  RecordObservationDto,
  UpdateAlertDto,
  AlertAction,
  DischargeVwDto,
  SearchEnrolmentsDto,
} from './dto';
import { Roles, CurrentUser, CurrentTenant } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

@Controller('virtual-wards')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class VirtualWardsController {
  constructor(@Inject(VirtualWardsService) private vwService: VirtualWardsService) {}

  @Post('enrolments')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  enrol(
    @Body() dto: EnrolPatientDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.vwService.enrolPatient(dto, user.id, tenantId);
  }

  @Get('enrolments')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  search(@Query() dto: SearchEnrolmentsDto, @CurrentTenant() tenantId: string) {
    return this.vwService.searchEnrolments(dto, tenantId);
  }

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  dashboard(@CurrentTenant() tenantId: string) {
    return this.vwService.getDashboard(tenantId);
  }

  @Get('enrolments/:id')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  getEnrolment(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.vwService.getEnrolment(id, tenantId);
  }

  @Post('enrolments/:id/protocols')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  createProtocol(
    @Param('id') id: string,
    @Body() dto: CreateProtocolDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.vwService.createProtocol(id, dto, tenantId);
  }

  @Patch('enrolments/:id/protocols/:protocolId')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  updateProtocol(
    @Param('id') id: string,
    @Param('protocolId') protocolId: string,
    @Body() dto: UpdateProtocolDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.vwService.updateProtocol(id, protocolId, dto, tenantId);
  }

  @Delete('enrolments/:id/protocols/:protocolId')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  deleteProtocol(
    @Param('id') id: string,
    @Param('protocolId') protocolId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.vwService.deleteProtocol(id, protocolId, tenantId);
  }

  @Post('enrolments/:id/observations')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  recordObservation(
    @Param('id') id: string,
    @Body() dto: RecordObservationDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.vwService.recordObservation(id, dto, user.id, tenantId);
  }

  @Get('enrolments/:id/observations')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  getObservations(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.vwService.getObservations(id, tenantId);
  }

  @Get('enrolments/:id/alerts')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  getAlerts(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.vwService.getAlerts(id, tenantId);
  }

  @Post('enrolments/:id/alerts/:alertId/acknowledge')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  acknowledgeAlert(
    @Param('id') id: string,
    @Param('alertId') alertId: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.vwService.acknowledgeAlert(id, alertId, user.id, tenantId);
  }

  @Post('enrolments/:id/alerts/:alertId/escalate')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  escalateAlert(
    @Param('id') id: string,
    @Param('alertId') alertId: string,
    @Body() body: { escalatedToId: string },
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.vwService.escalateAlert(id, alertId, body.escalatedToId, user.id, tenantId);
  }

  @Post('enrolments/:id/alerts/:alertId/resolve')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  resolveAlert(
    @Param('id') id: string,
    @Param('alertId') alertId: string,
    @Body() body: { resolveNotes?: string },
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.vwService.resolveAlert(id, alertId, body.resolveNotes, user.id, tenantId);
  }

  @Post('enrolments/:id/discharge')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  discharge(
    @Param('id') id: string,
    @Body() dto: DischargeVwDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.vwService.discharge(id, dto, user.id, tenantId);
  }
}
