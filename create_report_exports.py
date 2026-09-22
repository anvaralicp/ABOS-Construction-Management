import os

base_dir = "apps/api/src/modules/reports"

# 1. report-export.dto.ts
dto_content = """import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  ProjectSummaryQueryDto, 
  ExpenseReportQueryDto, 
  BudgetReportQueryDto, 
  VendorReportQueryDto, 
  WorkforceReportQueryDto, 
  EquipmentReportQueryDto, 
  ProgressReportQueryDto 
} from './report-query.dto';

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx'
}

export class ProjectSummaryExportQueryDto extends ProjectSummaryQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.CSV })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.CSV;
}

export class FinancialExportQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.CSV })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.CSV;
}

export class ExpenseExportQueryDto extends ExpenseReportQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.CSV })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.CSV;
}

export class BudgetExportQueryDto extends BudgetReportQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.CSV })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.CSV;
}

export class VendorExportQueryDto extends VendorReportQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.CSV })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.CSV;
}

export class WorkforceExportQueryDto extends WorkforceReportQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.CSV })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.CSV;
}

export class EquipmentExportQueryDto extends EquipmentReportQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.CSV })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.CSV;
}

export class ProgressExportQueryDto extends ProgressReportQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.CSV })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.CSV;
}
"""
os.makedirs(os.path.join(base_dir, "dto"), exist_ok=True)
with open(os.path.join(base_dir, "dto", "report-export.dto.ts"), "w") as f:
    f.write(dto_content)

# 2. report-export.service.ts
service_content = """import { Injectable, BadRequestException, NotImplementedException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { AuditService } from '../../core/audit/audit.service';
import { ExportFormat } from './dto/report-export.dto';

@Injectable()
export class ReportExportService {
  private readonly EXPORT_LIMIT = 10000;

  constructor(
    private readonly reportsService: ReportsService,
    private readonly auditService: AuditService
  ) {}

  private validateLimit(total: number) {
    if (total > this.EXPORT_LIMIT) {
      throw new BadRequestException(`Export limit exceeded. Maximum allowed is ${this.EXPORT_LIMIT}, but query matched ${total}.`);
    }
  }

  private escapeCsvValue(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') return val.toString(); // Numeric remains exactly numeric (e.g., -1250)
    
    if (val instanceof Date) {
      return val.toISOString(); 
    }

    const str = String(val);
    
    // Mitigate formula injection ONLY for string values that are not pure numbers
    if (/^[=+\-@]/.test(str)) {
      if (!isNaN(Number(str))) {
        return str; // Allow valid negative or positive numbers as they are safely treated as numbers
      }
      return `'${str}`;
    }
    
    return str;
  }

  private generateCsv(headers: string[], rows: any[][]): Buffer {
    const escapeCsvField = (field: string) => {
      if (field.includes(',') || field.includes('"') || field.includes('\\n') || field.includes('\\r')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const headerLine = headers.map(escapeCsvField).join(',');
    const rowLines = rows.map(row => row.map(v => escapeCsvField(this.escapeCsvValue(v))).join(','));
    return Buffer.from([headerLine, ...rowLines].join('\\n'), 'utf8');
  }

  private async generateXlsx(headers: string[], rows: any[][]): Promise<Buffer> {
    let ExcelJS;
    try {
      ExcelJS = require('exceljs');
    } catch (e) {
      throw new NotImplementedException('XLSX format generation pending exceljs dependency installation (blocked by environment limit).');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export');

    worksheet.addRow(headers);
    for (const row of rows) {
      const formattedRow = row.map(val => {
        if (typeof val === 'string' && /^[=+\-@]/.test(val) && isNaN(Number(val))) {
          // In exceljs, we just write the string with a single quote prefix so Excel interprets it as text
          return `'${val}`;
        }
        return val;
      });
      worksheet.addRow(formattedRow);
    }

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  async generateDocument(format: string, headers: string[], rows: any[][]): Promise<Buffer> {
    if (format === ExportFormat.XLSX) {
      return this.generateXlsx(headers, rows);
    } else if (format === ExportFormat.CSV) {
      return this.generateCsv(headers, rows);
    }
    throw new BadRequestException('Unsupported format');
  }

  private getContentType(format: string): string {
    if (format === ExportFormat.XLSX) {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    return 'text/csv; charset=utf-8';
  }

  private async logExport(context: TenantContext, reportType: string, format: string, recordCount: number) {
    await this.auditService.logEvent(context, {
      action: 'REPORT_EXPORT',
      entity_type: 'Report',
      entity_id: reportType,
      metadata: { format, recordCount }
    });
  }

  async exportProjectSummary(context: TenantContext, query: any, format: string) {
    const report = await this.reportsService.getProjectSummary(context, query);
    
    const headers = [
      'Project ID', 'Project Name', 'Project Code', 'Status',
      'Budget Total', 'Actual Expense Total', 'Paid To Vendors', 'Outstanding Vendor Amount', 'Variance',
      'Expense Count', 'Attendance Records', 'Assigned Workforce',
      'Equipment Assigned', 'Equipment Active', 'Progress Reports Count'
    ];

    const row = [
      report.project.id, report.project.name, report.project.code, report.project.status,
      report.financial.budget_total, report.financial.actual_expense_total, report.financial.paid_to_vendors, report.financial.outstanding_vendor_amount, report.financial.variance,
      report.expenses.count, report.workforce.attendance_records, report.workforce.assigned,
      report.equipment.assigned, report.equipment.active, report.progress.report_count
    ];

    const buffer = await this.generateDocument(format, headers, [row]);
    await this.logExport(context, 'project-summary', format, 1);
    
    return { buffer, contentType: this.getContentType(format), filename: `project-summary_${new Date().toISOString().split('T')[0]}.${format}` };
  }

  async exportFinancial(context: TenantContext, projectId: string | undefined, dateFrom: string | undefined, dateTo: string | undefined, format: string) {
    const report = await this.reportsService.getFinancialSummary(context, projectId, dateFrom, dateTo);
    
    const headers = ['Budget Total', 'Actual Expense Total', 'Paid To Vendors', 'Outstanding Vendor Amount', 'Variance'];
    const row = [report.budget_total, report.actual_expense_total, report.paid_to_vendors, report.outstanding_vendor_amount, report.variance];
    
    const buffer = await this.generateDocument(format, headers, [row]);
    await this.logExport(context, 'financial', format, 1);
    return { buffer, contentType: this.getContentType(format), filename: `financial_${new Date().toISOString().split('T')[0]}.${format}` };
  }

  async exportExpenses(context: TenantContext, query: any, format: string) {
    // Override pagination to fetch all (up to limit)
    const exportQuery = { ...query, page: 1, limit: this.EXPORT_LIMIT + 1 };
    const report = await this.reportsService.getExpensesReport(context, exportQuery);
    
    this.validateLimit(report.data.length);

    const headers = ['ID', 'Item', 'Category', 'Vendor', 'Status', 'Total Amount', 'Created At'];
    const rows = report.data.map(exp => [
      exp.id, exp.item, exp.category?.name || '', exp.vendor?.name || '', exp.status, exp.total_amount, exp.created_at
    ]);

    const buffer = await this.generateDocument(format, headers, rows);
    await this.logExport(context, 'expenses', format, rows.length);
    return { buffer, contentType: this.getContentType(format), filename: `expenses_${new Date().toISOString().split('T')[0]}.${format}` };
  }

  async exportBudget(context: TenantContext, query: any, format: string) {
    // getBudgetReport does not use pagination currently, returns { project, budget_total, actual_expense_total, variance, lines: [...] }
    const report = await this.reportsService.getBudgetReport(context, query);
    
    this.validateLimit(report.lines.length);

    const headers = ['Line ID', 'Category', 'Budget Amount', 'Actual Expense', 'Variance'];
    const rows = report.lines.map(l => [
      l.id, l.category_name, l.amount, l.actual_expense, l.variance
    ]);

    const buffer = await this.generateDocument(format, headers, rows);
    await this.logExport(context, 'budget', format, rows.length);
    return { buffer, contentType: this.getContentType(format), filename: `budget_${new Date().toISOString().split('T')[0]}.${format}` };
  }

  async exportVendors(context: TenantContext, query: any, format: string) {
    const exportQuery = { ...query, page: 1, limit: this.EXPORT_LIMIT + 1 };
    const report = await this.reportsService.getVendorsReport(context, exportQuery);
    
    this.validateLimit(report.meta.total);

    const headers = ['Vendor ID', 'Vendor Name', 'Expense Count', 'Payment Count', 'Expense Total', 'Payment Total', 'Outstanding Total'];
    const rows = report.data.map(v => [
      v.vendor.id, v.vendor.name, v.expense_count, v.payment_count, v.expense_total, v.payment_total, v.outstanding_total
    ]);

    const buffer = await this.generateDocument(format, headers, rows);
    await this.logExport(context, 'vendors', format, rows.length);
    return { buffer, contentType: this.getContentType(format), filename: `vendors_${new Date().toISOString().split('T')[0]}.${format}` };
  }

  async exportWorkforce(context: TenantContext, query: any, format: string) {
    const report = await this.reportsService.getWorkforceReport(context, query);
    
    const headers = ['Assigned Workforce Count', 'Attendance Days', 'Total Attendance Records', 'Present Count', 'Absent Count', 'Half Day Count', 'Leave Count'];
    const row = [
      report.assigned_workforce_count, report.attendance_days, report.total_attendance_records,
      report.present_count, report.absent_count, report.half_day_count, report.leave_count
    ];

    const buffer = await this.generateDocument(format, headers, [row]);
    await this.logExport(context, 'workforce', format, 1);
    return { buffer, contentType: this.getContentType(format), filename: `workforce_${new Date().toISOString().split('T')[0]}.${format}` };
  }

  async exportEquipment(context: TenantContext, query: any, format: string) {
    const report = await this.reportsService.getEquipmentReport(context, query);
    
    const headers = ['Total Assigned', 'Currently Active', 'Available', 'Maintenance', 'Inactive'];
    const row = [
      report.total_assigned, report.currently_active, report.available, report.maintenance, report.inactive
    ];

    const buffer = await this.generateDocument(format, headers, [row]);
    await this.logExport(context, 'equipment', format, 1);
    return { buffer, contentType: this.getContentType(format), filename: `equipment_${new Date().toISOString().split('T')[0]}.${format}` };
  }

  async exportProgress(context: TenantContext, query: any, format: string) {
    const exportQuery = { ...query, page: 1, limit: this.EXPORT_LIMIT + 1 };
    const report = await this.reportsService.getProgressReport(context, exportQuery);
    
    this.validateLimit(report.meta.total);

    const headers = ['Report Date', 'Work Summary', 'Accomplishments', 'Issues & Blockers', 'Next Day Plan'];
    const rows = report.chronological_summary.map(h => [
      h.report_date, h.work_summary, h.accomplishments, h.issues_blockers, h.next_day_plan
    ]);

    const buffer = await this.generateDocument(format, headers, rows);
    await this.logExport(context, 'progress', format, rows.length);
    return { buffer, contentType: this.getContentType(format), filename: `progress_${new Date().toISOString().split('T')[0]}.${format}` };
  }
}
"""
with open(os.path.join(base_dir, "report-export.service.ts"), "w") as f:
    f.write(service_content)

# 3. report-export.controller.ts
controller_content = """import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { ReportExportService } from './report-export.service';
import { 
  ProjectSummaryExportQueryDto, 
  ExpenseExportQueryDto, 
  BudgetExportQueryDto, 
  VendorExportQueryDto, 
  WorkforceExportQueryDto, 
  EquipmentExportQueryDto, 
  ProgressExportQueryDto,
  FinancialExportQueryDto
} from './dto/report-export.dto';

@ApiTags('Reports Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('reports')
export class ReportExportController {
  constructor(private readonly reportExportService: ReportExportService) {}

  private sendBuffer(res: Response, result: { buffer: Buffer, contentType: string, filename: string }) {
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    res.send(result.buffer);
  }

  @Get('project-summary/export')
  @RequirePermissions('reports:project-summary')
  @ApiOperation({ summary: 'Export project summary report' })
  async exportProjectSummary(
    @CurrentTenant() tenant: TenantContext, 
    @Query() query: ProjectSummaryExportQueryDto,
    @Res() res: Response
  ) {
    const result = await this.reportExportService.exportProjectSummary(tenant, query, query.format || 'csv');
    this.sendBuffer(res, result);
  }

  @Get('financial/export')
  @RequirePermissions('reports:financial')
  @ApiOperation({ summary: 'Export financial summary report' })
  async exportFinancialSummary(
    @CurrentTenant() tenant: TenantContext, 
    @Query() query: FinancialExportQueryDto,
    @Query('project_id') projectId: string,
    @Query('date_from') dateFrom: string,
    @Query('date_to') dateTo: string,
    @Res() res: Response
  ) {
    const result = await this.reportExportService.exportFinancial(tenant, projectId, dateFrom, dateTo, query.format || 'csv');
    this.sendBuffer(res, result);
  }

  @Get('expenses/export')
  @RequirePermissions('reports:expenses')
  @ApiOperation({ summary: 'Export expenses report' })
  async exportExpensesReport(
    @CurrentTenant() tenant: TenantContext, 
    @Query() query: ExpenseExportQueryDto,
    @Res() res: Response
  ) {
    const result = await this.reportExportService.exportExpenses(tenant, query, query.format || 'csv');
    this.sendBuffer(res, result);
  }

  @Get('budget/export')
  @RequirePermissions('reports:budget')
  @ApiOperation({ summary: 'Export budget report' })
  async exportBudgetReport(
    @CurrentTenant() tenant: TenantContext, 
    @Query() query: BudgetExportQueryDto,
    @Res() res: Response
  ) {
    const result = await this.reportExportService.exportBudget(tenant, query, query.format || 'csv');
    this.sendBuffer(res, result);
  }

  @Get('vendors/export')
  @RequirePermissions('reports:vendors')
  @ApiOperation({ summary: 'Export vendors report' })
  async exportVendorsReport(
    @CurrentTenant() tenant: TenantContext, 
    @Query() query: VendorExportQueryDto,
    @Res() res: Response
  ) {
    const result = await this.reportExportService.exportVendors(tenant, query, query.format || 'csv');
    this.sendBuffer(res, result);
  }

  @Get('workforce/export')
  @RequirePermissions('reports:workforce')
  @ApiOperation({ summary: 'Export workforce report' })
  async exportWorkforceReport(
    @CurrentTenant() tenant: TenantContext, 
    @Query() query: WorkforceExportQueryDto,
    @Res() res: Response
  ) {
    const result = await this.reportExportService.exportWorkforce(tenant, query, query.format || 'csv');
    this.sendBuffer(res, result);
  }

  @Get('equipment/export')
  @RequirePermissions('reports:equipment')
  @ApiOperation({ summary: 'Export equipment report' })
  async exportEquipmentReport(
    @CurrentTenant() tenant: TenantContext, 
    @Query() query: EquipmentExportQueryDto,
    @Res() res: Response
  ) {
    const result = await this.reportExportService.exportEquipment(tenant, query, query.format || 'csv');
    this.sendBuffer(res, result);
  }

  @Get('progress/export')
  @RequirePermissions('reports:progress')
  @ApiOperation({ summary: 'Export progress report' })
  async exportProgressReport(
    @CurrentTenant() tenant: TenantContext, 
    @Query() query: ProgressExportQueryDto,
    @Res() res: Response
  ) {
    const result = await this.reportExportService.exportProgress(tenant, query, query.format || 'csv');
    this.sendBuffer(res, result);
  }
}
"""
with open(os.path.join(base_dir, "report-export.controller.ts"), "w") as f:
    f.write(controller_content)

# Update reports.module.ts
module_path = os.path.join(base_dir, "reports.module.ts")
with open(module_path, "r") as f:
    module_content = f.read()

if "ReportExportController" not in module_content:
    module_content = module_content.replace(
        "import { ReportsService } from './reports.service';",
        "import { ReportsService } from './reports.service';\\nimport { ReportExportController } from './report-export.controller';\\nimport { ReportExportService } from './report-export.service';"
    )
    module_content = module_content.replace(
        "controllers: [ReportsController],",
        "controllers: [ReportsController, ReportExportController],"
    )
    module_content = module_content.replace(
        "providers: [ReportsService],",
        "providers: [ReportsService, ReportExportService],"
    )
    with open(module_path, "w") as f:
        f.write(module_content)
