import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, PushService],
  exports: [NotificationsService, EmailService, PushService],
})
export class NotificationsModule {}
