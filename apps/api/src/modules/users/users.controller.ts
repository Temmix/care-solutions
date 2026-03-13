import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Roles, CurrentUser, CurrentTenant } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

// ── Super Admin management (no tenant required) ──────────

@Controller('users/super-admins')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SuperAdminsController {
  constructor(@Inject(UsersService) private usersService: UsersService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.usersService.findAllSuperAdmins(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post()
  create(@Body() dto: CreateSuperAdminDto) {
    return this.usersService.createSuperAdmin(dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.usersService.deactivateSuperAdmin(id, user.id);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.usersService.reactivateSuperAdmin(id);
  }
}

// ── Tenant-scoped user management ─────────────────────────

@Controller('users')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class UsersController {
  constructor(@Inject(UsersService) private usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTenantUserDto, @CurrentTenant() tenantId: string) {
    return this.usersService.createTenantUser(dto, tenantId);
  }

  @Patch('change-password')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER, Role.PATIENT)
  changePassword(@CurrentUser() user: { id: string }, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAll(
      tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.usersService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentTenant() tenantId: string) {
    return this.usersService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.usersService.remove(id, tenantId);
  }
}
