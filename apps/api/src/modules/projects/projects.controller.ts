import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, UpdateProjectStatusDto, AddProjectMemberDto } from './dto/project.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Create a new project' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(tenant, dto);
  }

  @Get()
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'List organization projects' })
  async findAll(@CurrentTenant() tenant: TenantContext) {
    return this.projectsService.findAll(tenant);
  }

  @Get(':id')
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'Get project details' })
  async findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.projectsService.findOne(tenant, id);
  }

  @Patch(':id')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Update project details' })
  async update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(tenant, id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Update project lifecycle status' })
  async updateStatus(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateProjectStatusDto) {
    return this.projectsService.updateStatus(tenant, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('projects:delete')
  @ApiOperation({ summary: 'Archive/Delete a project' })
  async delete(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.projectsService.delete(tenant, id);
  }

  @Get(':id/members')
  @RequirePermissions('project_members:read')
  @ApiOperation({ summary: 'List project members' })
  async listMembers(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.projectsService.listMembers(tenant, id);
  }

  @Post(':id/members')
  @RequirePermissions('project_members:write')
  @ApiOperation({ summary: 'Add an organization member to a project' })
  async addMember(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: AddProjectMemberDto) {
    return this.projectsService.addMember(tenant, id, dto);
  }

  @Delete(':id/members/:memberId')
  @RequirePermissions('project_members:write')
  @ApiOperation({ summary: 'Remove a member from a project' })
  async removeMember(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Param('memberId') memberId: string) {
    return this.projectsService.removeMember(tenant, id, memberId);
  }
}
