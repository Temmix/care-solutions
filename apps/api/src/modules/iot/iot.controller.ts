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
import { IotService } from './iot.service';
import {
  RegisterDeviceDto,
  UpdateDeviceDto,
  AssignDeviceDto,
  CreateApiKeyDto,
  DeviceQueryDto,
} from './dto';
import { Roles, CurrentUser, CurrentTenant } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

@Controller('iot')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class IotController {
  constructor(@Inject(IotService) private iotService: IotService) {}

  // ── Devices ────────────────────────────────────────────

  @Post('devices')
  @Roles(Role.ADMIN)
  registerDevice(
    @Body() dto: RegisterDeviceDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.iotService.registerDevice(dto, user.id, tenantId);
  }

  @Get('devices')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  listDevices(@Query() query: DeviceQueryDto, @CurrentTenant() tenantId: string) {
    return this.iotService.listDevices(query, tenantId);
  }

  @Get('devices/:id')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  getDevice(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.iotService.getDevice(id, tenantId);
  }

  @Patch('devices/:id')
  @Roles(Role.ADMIN)
  updateDevice(
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.iotService.updateDevice(id, dto, user.id, tenantId);
  }

  @Post('devices/:id/decommission')
  @Roles(Role.ADMIN)
  decommissionDevice(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.iotService.decommissionDevice(id, user.id, tenantId);
  }

  @Post('devices/:id/assign')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  assignDevice(
    @Param('id') id: string,
    @Body() dto: AssignDeviceDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.iotService.assignDevice(id, dto, user.id, tenantId);
  }

  @Post('devices/:id/unassign')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  unassignDevice(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.iotService.unassignDevice(id, user.id, tenantId);
  }

  // ── API Keys ───────────────────────────────────────────

  @Post('api-keys')
  @Roles(Role.ADMIN)
  createApiKey(
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.iotService.createApiKey(dto, user.id, tenantId);
  }

  @Get('api-keys')
  @Roles(Role.ADMIN)
  listApiKeys(@CurrentTenant() tenantId: string) {
    return this.iotService.listApiKeys(tenantId);
  }

  @Delete('api-keys/:id')
  @Roles(Role.ADMIN)
  revokeApiKey(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.iotService.revokeApiKey(id, user.id, tenantId);
  }
}
