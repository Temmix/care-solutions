import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { TrainingTypesService } from './training-types.service';
import { CreateTrainingTypeDto, UpdateTrainingTypeDto } from './dto';
import { Roles, CurrentUser, CurrentTenant } from '../../../common/decorators';
import { RolesGuard, TenantGuard } from '../../../common/guards';

interface RequestUser {
  id: string;
  globalRole: string;
}

@Controller('training-types')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class TrainingTypesController {
  constructor(@Inject(TrainingTypesService) private service: TrainingTypesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER, Role.SUPER_ADMIN)
  findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAllForTenant(tenantId || null);
  }

  @Get('system')
  @Roles(Role.SUPER_ADMIN)
  findSystem() {
    return this.service.findSystemTypes();
  }

  @Get('tenant')
  @Roles(Role.ADMIN)
  findTenant(@CurrentTenant() tenantId: string) {
    return this.service.findTenantTypes(tenantId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(
    @Body() dto: CreateTrainingTypeDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    const scope = user.globalRole === 'SUPER_ADMIN' && !tenantId ? null : tenantId;
    return this.service.create(dto, scope);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTrainingTypeDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    const scope = user.globalRole === 'SUPER_ADMIN' && !tenantId ? null : tenantId;
    return this.service.update(id, dto, scope);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  deactivate(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    const scope = user.globalRole === 'SUPER_ADMIN' && !tenantId ? null : tenantId;
    return this.service.deactivate(id, scope);
  }
}
