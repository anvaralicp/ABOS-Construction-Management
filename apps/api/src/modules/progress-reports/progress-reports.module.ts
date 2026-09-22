import { Module } from '@nestjs/common';
import { ProgressReportsService } from './progress-reports.service';
import { ProgressReportsController, ProjectProgressReportsController } from './progress-reports.controller';

@Module({
  controllers: [ProgressReportsController, ProjectProgressReportsController],
  providers: [ProgressReportsService],
  exports: [ProgressReportsService],
})
export class ProgressReportsModule {}
