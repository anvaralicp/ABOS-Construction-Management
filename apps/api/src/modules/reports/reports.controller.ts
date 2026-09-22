import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { ReportsService } from './reports.service';
import { 
  ProjectSummaryQueryDto, 
  ExpenseReportQueryDto, 
  BudgetReportQueryDto, 
  VendorReportQueryDto, 
  WorkforceReportQueryDto, 
  EquipmentReportQueryDto, 
  ProgressReportQueryDto 
} from './dto/report-query.dto';

@ApiTags('Reports & Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('project-summary')
  @RequirePermissions('reports:project-summary')
  @ApiOperation({ summary: 'Get consolidated project summary dashboard' })
  async getProjectSummary(@CurrentTenant() tenant: TenantContext, @Query() query: ProjectSummaryQueryDto) {
    return this.reportsService.getProjectSummary(tenant, query);
  }

  @Get('financial')
  @RequirePermissions('reports:financial')
  @ApiOperation({ summary: 'Get high-level financial summary' })
  async getFinancialSummary(
    @CurrentTenant() tenant: TenantContext, 
    @Query('project_id') projectId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string
  ) {
    return this.reportsService.getFinancialSummary(tenant, projectId, dateFrom, dateTo);
  }

  @Get('expenses')
  @RequirePermissions('reports:expenses')
  @ApiOperation({ summary: 'Get expenses report' })
  async getExpensesReport(@CurrentTenant() tenant: TenantContext, @Query() query: ExpenseReportQueryDto) {
    return this.reportsService.getExpensesReport(tenant, query);
  }

  @Get('budget')
  @RequirePermissions('reports:budget')
  @ApiOperation({ summary: 'Get budget versus actual report' })
  async getBudgetReport(@CurrentTenant() tenant: TenantContext, @Query() query: BudgetReportQueryDto) {
    return this.reportsService.getBudgetReport(tenant, query);
  }

  @Get('vendors')
  @RequirePermissions('reports:vendors')
  @ApiOperation({ summary: 'Get vendor financial position report' })
  async getVendorsReport(@CurrentTenant() tenant: TenantContext, @Query() query: VendorReportQueryDto) {
    return this.reportsService.getVendorsReport(tenant, query);
  }

  @Get('workforce')
  @RequirePermissions('reports:workforce')
  @ApiOperation({ summary: 'Get workforce attendance report' })
  async getWorkforceReport(@CurrentTenant() tenant: TenantContext, @Query() query: WorkforceReportQueryDto) {
    return this.reportsService.getWorkforceReport(tenant, query);
  }

  @Get('equipment')
  @RequirePermissions('reports:equipment') // Correct permission for equipment is probably missing in requirements list but implied? I will use reports:read or we can define it. I'll stick with reports:equipment to be safe. Wait, user said: "reports:read reports:project-summary reports:financial reports:expenses reports:budget reports:workforce reports:vendors reports:progress". They didn't mention reports:equipment. I will use reports:equipment or reports:read. Let's use reports:read. Actually, I'll use reports:read for equipment or add reports:equipment to the list. I'll add reports:equipment.
  @ApiOperation({ summary: 'Get equipment assignment report' })
  async getEquipmentReport(@CurrentTenant() tenant: TenantContext, @Query() query: EquipmentReportQueryDto) {
    // We'll just enforce reports:read as a fallback in tests if they didn't ask for it, but better to add reports:equipment
    return this.reportsService.getEquipmentReport(tenant, query);
  }

  @Get('progress')
  @RequirePermissions('reports:progress')
  @ApiOperation({ summary: 'Get progress timeline report' })
  async getProgressReport(@CurrentTenant() tenant: TenantContext, @Query() query: ProgressReportQueryDto) {
    return this.reportsService.getProgressReport(tenant, query);
  }
}
