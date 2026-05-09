import { Controller, Get, Post, Patch, Param, Body, UseGuards, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { TenantVerificationService } from './tenant-verification.service';
import {
  VerifyTenantDto,
  RejectTenantDto,
  ResetVerificationDto,
  UpdateTenantIdentityDto,
} from './dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('admin/tenants')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class TenantVerificationController {
  constructor(@Inject(TenantVerificationService) private service: TenantVerificationService) {}

  @Get('pending-verification')
  listPendingVerification() {
    return this.service.listPendingVerification();
  }

  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.service.getTenantDetail(id);
  }

  @Patch(':id/identity')
  updateIdentity(
    @Param('id') id: string,
    @Body() body: UpdateTenantIdentityDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.updateIdentity(id, body, user.id);
  }

  @Post(':id/verify')
  verify(
    @Param('id') id: string,
    @Body() body: VerifyTenantDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.verify(id, user.id, body.notes);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() body: RejectTenantDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.reject(id, user.id, body.reason);
  }

  @Post(':id/reset-verification')
  resetVerification(
    @Param('id') id: string,
    @Body() body: ResetVerificationDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.resetVerification(id, user.id, body.reason);
  }
}
