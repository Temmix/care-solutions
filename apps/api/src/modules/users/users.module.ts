import { Module } from '@nestjs/common';
import { UsersController, SuperAdminsController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [SuperAdminsController, UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
