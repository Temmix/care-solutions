import { Module } from '@nestjs/common';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { TrainingTypesController } from './training-types/training-types.controller';
import { TrainingTypesService } from './training-types/training-types.service';

@Module({
  controllers: [TrainingController, TrainingTypesController],
  providers: [TrainingService, TrainingTypesService],
  exports: [TrainingService, TrainingTypesService],
})
export class TrainingModule {}
