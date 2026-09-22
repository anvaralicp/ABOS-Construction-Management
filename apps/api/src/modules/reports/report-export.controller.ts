import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
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
