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
import { AssessmentTypesService } from './assessment-types.service';
import { CreateAssessmentTypeDto, UpdateAssessmentTypeDto } from './dto';
import { Roles, CurrentUser, CurrentTenant } from '../../../common/decorators';
import { RolesGuard, TenantGuard } from '../../../common/guards';

interface RequestUser {
  id: string;
  role: string;
}

@Controller('assessment-types')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class AssessmentTypesController {
  constructor(@Inject(AssessmentTypesService) private service: AssessmentTypesService) {}

  // List available types for current tenant (system + tenant-specific)
  @Get()
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER, Role.SUPER_ADMIN)
  findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAllForTenant(tenantId || null);
  }

  // List system-wide types only (super admin management)
  @Get('system')
  @Roles(Role.SUPER_ADMIN)
  findSystem() {
    return this.service.findSystemTypes();
  }

  // List tenant-specific types only (admin management)
  @Get('tenant')
  @Roles(Role.ADMIN)
  findTenant(@CurrentTenant() tenantId: string) {
    return this.service.findTenantTypes(tenantId);
  }

  // Create a new type
  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(
    @Body() dto: CreateAssessmentTypeDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    // Super admin without tenant context → system-wide type
    const scope = user.role === 'SUPER_ADMIN' && !tenantId ? null : tenantId;
    return this.service.create(dto, scope);
  }

  // Update a type
  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentTypeDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    const scope = user.role === 'SUPER_ADMIN' && !tenantId ? null : tenantId;
    return this.service.update(id, dto, scope);
  }

  // Deactivate a type (soft delete)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  deactivate(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    const scope = user.role === 'SUPER_ADMIN' && !tenantId ? null : tenantId;
    return this.service.deactivate(id, scope);
  }
}
