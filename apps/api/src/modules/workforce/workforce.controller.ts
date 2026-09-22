import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { WorkforceService } from './workforce.service';
import { CreateWorkforceDto, UpdateWorkforceDto, CreateAssignmentDto, UpdateAssignmentDto, CreateAttendanceDto, UpdateAttendanceDto, WorkforceQueryDto } from './dto/workforce.dto';

@ApiTags('Workforce')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('workforce')
export class WorkforceController {
  constructor(private readonly workforceService: WorkforceService) {}

  // --- Workforce Members ---

  @Post()
  @RequirePermissions('workforce:write')
  @ApiOperation({ summary: 'Create a new workforce member' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateWorkforceDto) {
    return this.workforceService.create(tenant, dto);
  }

  @Get()
  @RequirePermissions('workforce:read')
  @ApiOperation({ summary: 'List organization workforce' })
  async findAll(@CurrentTenant() tenant: TenantContext, @Query() query: WorkforceQueryDto) {
    return this.workforceService.findAll(tenant, query);
  }

  @Get(':id')
  @RequirePermissions('workforce:read')
  @ApiOperation({ summary: 'Get workforce member details' })
  async findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.workforceService.findOne(tenant, id);
  }

  @Patch(':id')
  @RequirePermissions('workforce:write')
  @ApiOperation({ summary: 'Update workforce member' })
  async update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateWorkforceDto) {
    return this.workforceService.update(tenant, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('workforce:delete')
  @ApiOperation({ summary: 'Archive workforce member' })
  async delete(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.workforceService.delete(tenant, id);
  }

  // --- Assignments ---

  @Post(':id/assignments')
  @RequirePermissions('workforce_assignments:write')
  @ApiOperation({ summary: 'Assign workforce member to project' })
  async createAssignment(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: CreateAssignmentDto) {
    return this.workforceService.createAssignment(tenant, id, dto);
  }

  @Get(':id/assignments')
  @RequirePermissions('workforce_assignments:read')
  @ApiOperation({ summary: 'Get workforce member assignments' })
  async getAssignments(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.workforceService.getAssignments(tenant, id);
  }

  @Patch(':id/assignments/:assignmentId')
  @RequirePermissions('workforce_assignments:write')
  @ApiOperation({ summary: 'Update workforce member assignment' })
  async updateAssignment(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Param('assignmentId') assignmentId: string, @Body() dto: UpdateAssignmentDto) {
    return this.workforceService.updateAssignment(tenant, id, assignmentId, dto);
  }

  // --- Daily Attendance ---

  @Post(':id/attendance')
  @RequirePermissions('attendance:write')
  @ApiOperation({ summary: 'Record daily attendance' })
  async createAttendance(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: CreateAttendanceDto) {
    return this.workforceService.createAttendance(tenant, id, dto);
  }

  @Patch(':id/attendance/:attendanceId')
  @RequirePermissions('attendance:write')
  @ApiOperation({ summary: 'Update daily attendance' })
  async updateAttendance(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Param('attendanceId') attendanceId: string, @Body() dto: UpdateAttendanceDto) {
    return this.workforceService.updateAttendance(tenant, id, attendanceId, dto);
  }
}

// Separate controller for project-centric endpoints to avoid circular dependencies
@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('projects')
export class ProjectWorkforceController {
  constructor(private readonly workforceService: WorkforceService) {}

  @Get(':projectId/workforce')
  @RequirePermissions('workforce_assignments:read')
  @ApiOperation({ summary: 'Get workforce members assigned to project' })
  async getProjectWorkforce(@CurrentTenant() tenant: TenantContext, @Param('projectId') projectId: string) {
    return this.workforceService.getProjectWorkforce(tenant, projectId);
  }
}
