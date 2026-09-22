import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { ProgressReportsService } from './progress-reports.service';
import { CreateProgressReportDto, UpdateProgressReportDto, ProgressReportQueryDto, AttachDocumentDto } from './dto/progress-report.dto';

@ApiTags('Progress Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('progress-reports')
export class ProgressReportsController {
  constructor(private readonly reportsService: ProgressReportsService) {}

  @Post()
  @RequirePermissions('progress_reports:create')
  @ApiOperation({ summary: 'Create a new daily progress report' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateProgressReportDto) {
    return this.reportsService.create(tenant, dto);
  }

  @Get()
  @RequirePermissions('progress_reports:read')
  @ApiOperation({ summary: 'List progress reports' })
  async findAll(@CurrentTenant() tenant: TenantContext, @Query() query: ProgressReportQueryDto) {
    return this.reportsService.findAll(tenant, query);
  }

  @Get(':id')
  @RequirePermissions('progress_reports:read')
  @ApiOperation({ summary: 'Get progress report details' })
  async findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.reportsService.findOne(tenant, id);
  }

  @Get(':id/daily-context')
  @RequirePermissions('progress_reports:read')
  @ApiOperation({ summary: 'Get daily project context for a progress report' })
  async getDailyContext(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.reportsService.getDailyContext(tenant, id);
  }

  @Patch(':id')
  @RequirePermissions('progress_reports:update')
  @ApiOperation({ summary: 'Update a progress report (Optimistic concurrency)' })
  async update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateProgressReportDto) {
    return this.reportsService.update(tenant, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('progress_reports:delete')
  @ApiOperation({ summary: 'Archive a progress report' })
  async delete(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.reportsService.delete(tenant, id);
  }

  // --- Attachments ---

  @Post(':id/attachments')
  @RequirePermissions('progress_reports:update')
  @ApiOperation({ summary: 'Attach a document to a progress report' })
  async attachDocument(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: AttachDocumentDto) {
    return this.reportsService.attachDocument(tenant, id, dto);
  }

  @Delete(':id/attachments/:attachmentId')
  @RequirePermissions('progress_reports:update')
  @ApiOperation({ summary: 'Remove an attachment from a progress report' })
  async removeAttachment(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Param('attachmentId') attachmentId: string) {
    return this.reportsService.removeAttachment(tenant, id, attachmentId);
  }
}

// Project-scoped lookup controller
@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('projects')
export class ProjectProgressReportsController {
  constructor(private readonly reportsService: ProgressReportsService) {}

  @Get(':projectId/progress-reports')
  @RequirePermissions('progress_reports:read')
  @ApiOperation({ summary: 'List all progress reports for a specific project' })
  async getProjectReports(
    @CurrentTenant() tenant: TenantContext, 
    @Param('projectId') projectId: string,
    @Query() query: ProgressReportQueryDto
  ) {
    return this.reportsService.findAll(tenant, { ...query, project_id: projectId });
  }
}
