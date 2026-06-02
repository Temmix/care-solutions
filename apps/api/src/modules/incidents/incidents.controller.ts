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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role, IncidentStatus } from '@prisma/client';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { Roles, CurrentUser, CurrentTenant } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

/**
 * Security / data-protection incident register. Admin-managed (SUPER_ADMIN
 * bypasses RolesGuard). All mutations are audit-logged.
 */
@Controller('incidents')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TENANT_ADMIN)
export class IncidentsController {
  constructor(@Inject(IncidentsService) private readonly incidents: IncidentsService) {}

  @Post()
  create(
    @Body() dto: CreateIncidentDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.incidents.create(dto, user.id, tenantId);
  }

  @Get()
  list(@CurrentTenant() tenantId: string, @Query('status') status?: IncidentStatus) {
    return this.incidents.list(tenantId, status);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.incidents.get(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.incidents.update(id, dto, user.id, tenantId);
  }
}
