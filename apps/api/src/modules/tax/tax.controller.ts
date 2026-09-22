import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { TaxService } from './tax.service';
import { CreateTaxConfigDto, UpdateTaxConfigDto, ValidateGstinDto } from './dto/tax-config.dto';
import { TaxReportQueryDto } from './dto/tax-query.dto';

@ApiTags('GST & Tax Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post('configurations')
  @RequirePermissions('tax:create')
  @ApiOperation({ summary: 'Create tax configuration' })
  async createConfig(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateTaxConfigDto) {
    return this.taxService.createConfig(tenant, dto);
  }

  @Get('configurations')
  @RequirePermissions('tax:read')
  @ApiOperation({ summary: 'List tax configurations' })
  async getConfigs(@CurrentTenant() tenant: TenantContext) {
    return this.taxService.getConfigs(tenant);
  }

  @Get('configurations/:id')
  @RequirePermissions('tax:read')
  @ApiOperation({ summary: 'Get tax configuration by id' })
  async getConfig(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.taxService.getConfig(tenant, id);
  }

  @Patch('configurations/:id')
  @RequirePermissions('tax:update')
  @ApiOperation({ summary: 'Update tax configuration' })
  async updateConfig(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateTaxConfigDto) {
    return this.taxService.updateConfig(tenant, id, dto);
  }

  @Delete('configurations/:id')
  @RequirePermissions('tax:delete')
  @ApiOperation({ summary: 'Delete tax configuration' })
  async deleteConfig(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.taxService.deleteConfig(tenant, id);
  }

  @Post('validate-gstin')
  @RequirePermissions('tax:read')
  @ApiOperation({ summary: 'Validate GSTIN format' })
  async validateGstin(@Body() dto: ValidateGstinDto) {
    return this.taxService.validateGstin(dto);
  }

  @Get('reports/summary')
  @RequirePermissions('tax:report')
  @ApiOperation({ summary: 'Get tax summary report' })
  async getSummaryReport(@CurrentTenant() tenant: TenantContext, @Query() query: TaxReportQueryDto) {
    return this.taxService.getSummaryReport(tenant, query);
  }

  @Get('reports/vendors')
  @RequirePermissions('tax:report')
  @ApiOperation({ summary: 'Get tax vendor report' })
  async getVendorsReport(@CurrentTenant() tenant: TenantContext, @Query() query: TaxReportQueryDto) {
    return this.taxService.getVendorsReport(tenant, query);
  }

  @Get('reports/projects')
  @RequirePermissions('tax:report')
  @ApiOperation({ summary: 'Get tax project report' })
  async getProjectsReport(@CurrentTenant() tenant: TenantContext, @Query() query: TaxReportQueryDto) {
    return this.taxService.getProjectsReport(tenant, query);
  }
}
