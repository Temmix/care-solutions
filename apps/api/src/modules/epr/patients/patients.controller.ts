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
import { PatientsService } from './patients.service';
import { CreatePatientDto, UpdatePatientDto, SearchPatientDto, CreatePatientEventDto } from './dto';
import { Roles, CurrentUser, CurrentTenant } from '../../../common/decorators';
import { RolesGuard, TenantGuard, SubscriptionGuard } from '../../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  role: string;
}

@Controller('patients')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class PatientsController {
  constructor(@Inject(PatientsService) private patientsService: PatientsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  create(
    @Body() dto: CreatePatientDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.create(dto, user.id, tenantId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  search(@Query() dto: SearchPatientDto, @CurrentTenant() tenantId: string) {
    return this.patientsService.search(dto, tenantId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.findOne(id, tenantId, user.id, user.role);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.update(id, dto, user.id, tenantId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  deactivate(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.deactivate(id, user.id, tenantId);
  }

  @Get(':id/timeline')
  getTimeline(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Query('eventType') eventType?: string,
    @Query('careSetting') careSetting?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.patientsService.getTimeline(id, tenantId, {
      eventType,
      careSetting,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post(':id/events')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  addEvent(
    @Param('id') id: string,
    @Body() dto: CreatePatientEventDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.patientsService.addEvent(id, dto, user.id, tenantId);
  }
}
