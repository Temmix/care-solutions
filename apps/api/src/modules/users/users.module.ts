import { Module } from '@nestjs/common';
import { UsersController, SuperAdminsController, TenantAdminsController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [SuperAdminsController, TenantAdminsController, UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
