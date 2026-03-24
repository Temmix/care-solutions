import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Body,
  Param,
  Query,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { SearchNotificationsDto, UpdatePreferencesDto } from './dto';
import { CurrentUser, CurrentTenant } from '../../common/decorators';
import { TenantGuard } from '../../common/guards';

interface RequestUser {
  id: string;
}

@Controller('notifications')
@UseGuards(AuthGuard('jwt'), TenantGuard)
export class NotificationsController {
  constructor(
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
    @Query() dto: SearchNotificationsDto,
  ) {
    return this.notificationsService.list(user.id, tenantId, dto);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: RequestUser, @CurrentTenant() tenantId: string) {
    return this.notificationsService.getUnreadCount(user.id, tenantId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Post('mark-all-read')
  markAllRead(@CurrentUser() user: RequestUser, @CurrentTenant() tenantId: string) {
    return this.notificationsService.markAllRead(user.id, tenantId);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: RequestUser) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Put('preferences')
  updatePreferences(@CurrentUser() user: RequestUser, @Body() dto: UpdatePreferencesDto) {
    return this.notificationsService.updatePreferences(user.id, dto);
  }
}
