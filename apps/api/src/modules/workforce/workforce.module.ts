import { Module } from '@nestjs/common';
import { WorkforceService } from './workforce.service';
import { WorkforceController, ProjectWorkforceController } from './workforce.controller';

@Module({
  controllers: [WorkforceController, ProjectWorkforceController],
  providers: [WorkforceService],
  exports: [WorkforceService],
})
export class WorkforceModule {}
