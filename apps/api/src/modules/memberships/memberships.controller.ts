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
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { MembershipsService } from './memberships.service';
import { CreateMembershipDto, UpdateMembershipDto } from './dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

@Controller('users/:userId/memberships')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MembershipsController {
  constructor(@Inject(MembershipsService) private membershipsService: MembershipsService) {}

  @Get()
  listMemberships(@Param('userId') userId: string, @CurrentUser() user: RequestUser) {
    // Users can view their own memberships; SUPER_ADMIN/TENANT_ADMIN can view anyone's
    if (
      user.id !== userId &&
      user.globalRole !== 'SUPER_ADMIN' &&
      user.globalRole !== 'TENANT_ADMIN'
    ) {
      throw new ForbiddenException('You can only view your own memberships.');
    }
    return this.membershipsService.findByUserId(userId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  createMembership(@Param('userId') userId: string, @Body() dto: CreateMembershipDto) {
    return this.membershipsService.createMembership(userId, dto);
  }

  @Patch(':organizationId')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  updateMembership(
    @Param('userId') userId: string,
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    if (dto.role) {
      return this.membershipsService.updateMembershipRole(userId, organizationId, dto.role);
    }
    if (dto.status === 'INACTIVE') {
      return this.membershipsService.deactivateMembership(userId, organizationId);
    }
    return this.membershipsService.findByUserId(userId);
  }

  @Delete(':organizationId')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  deactivateMembership(
    @Param('userId') userId: string,
    @Param('organizationId') organizationId: string,
  ) {
    return this.membershipsService.deactivateMembership(userId, organizationId);
  }
}
