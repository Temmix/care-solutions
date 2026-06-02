import { Module } from '@nestjs/common';
import { SubProcessorsController } from './sub-processors.controller';
import { SubProcessorsService } from './sub-processors.service';

@Module({
  controllers: [SubProcessorsController],
  providers: [SubProcessorsService],
  exports: [SubProcessorsService],
})
export class SubProcessorsModule {}
