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
import { TrainingService } from './training.service';
import {
  CreateTrainingRecordDto,
  UpdateTrainingRecordDto,
  CreateCertificateDto,
  UpdateCertificateDto,
  SearchTrainingDto,
} from './dto';
import { Roles, CurrentUser, CurrentTenant } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

@Controller('training')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class TrainingController {
  constructor(@Inject(TrainingService) private trainingService: TrainingService) {}

  // ── Training Records ────────────────────────────────

  @Post()
  @Roles(Role.ADMIN)
  createTrainingRecord(
    @Body() dto: CreateTrainingRecordDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.trainingService.createTrainingRecord(dto, user.id, tenantId);
  }

  @Get()
  @Roles(Role.ADMIN)
  listTrainingRecords(@Query() query: SearchTrainingDto, @CurrentTenant() tenantId: string | null) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.trainingService.listTrainingRecords(tenantId, query);
  }

  @Get('me')
  getMyTrainingRecords(@CurrentUser() user: RequestUser, @CurrentTenant() tenantId: string | null) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.trainingService.getMyTrainingRecords(user.id, tenantId);
  }

  @Get('summary')
  @Roles(Role.ADMIN)
  getTrainingSummary(@CurrentTenant() tenantId: string | null) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.trainingService.getTrainingSummary(tenantId);
  }

  @Get('expiring')
  @Roles(Role.ADMIN)
  getExpiringTraining(@Query('days') days: string, @CurrentTenant() tenantId: string | null) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    const daysAhead = days ? parseInt(days, 10) : 30;
    return this.trainingService.getExpiringTraining(tenantId, daysAhead);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  getTrainingRecord(@Param('id') id: string, @CurrentTenant() tenantId: string | null) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.trainingService.getTrainingRecord(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  updateTrainingRecord(
    @Param('id') id: string,
    @Body() dto: UpdateTrainingRecordDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.trainingService.updateTrainingRecord(id, dto, tenantId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  deleteTrainingRecord(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string | null,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.trainingService.deleteTrainingRecord(id, user.id, tenantId);
  }

  // ── Certificates ────────────────────────────────────

  @Post(':id/certificates')
  @Roles(Role.ADMIN)
  addCertificate(
    @Param('id') trainingRecordId: string,
    @Body() dto: CreateCertificateDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.trainingService.addCertificate(trainingRecordId, dto, tenantId);
  }

  @Patch(':id/certificates/:certId')
  @Roles(Role.ADMIN)
  updateCertificate(
    @Param('id') trainingRecordId: string,
    @Param('certId') certId: string,
    @Body() dto: UpdateCertificateDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.trainingService.updateCertificate(trainingRecordId, certId, dto, tenantId);
  }

  @Delete(':id/certificates/:certId')
  @Roles(Role.ADMIN)
  deleteCertificate(
    @Param('id') trainingRecordId: string,
    @Param('certId') certId: string,
    @CurrentTenant() tenantId: string | null,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant selection required');
    return this.trainingService.deleteCertificate(trainingRecordId, certId, tenantId);
  }
}
