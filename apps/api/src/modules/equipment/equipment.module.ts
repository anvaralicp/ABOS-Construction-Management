import { Module } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { EquipmentController, ProjectEquipmentController } from './equipment.controller';

@Module({
  controllers: [EquipmentController, ProjectEquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
