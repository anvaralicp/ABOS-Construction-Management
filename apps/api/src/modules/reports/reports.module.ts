import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';\nimport { ReportExportController } from './report-export.controller';\nimport { ReportExportService } from './report-export.service';

@Module({
  controllers: [ReportsController, ReportExportController],
  providers: [ReportsService, ReportExportService],
  exports: [ReportsService],
})
export class ReportsModule {}
