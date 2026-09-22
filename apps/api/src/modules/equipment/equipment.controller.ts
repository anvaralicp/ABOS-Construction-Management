import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto, UpdateEquipmentDto, EquipmentQueryDto, AssignEquipmentDto, UpdateAssignmentDto } from './dto/equipment.dto';

@ApiTags('Equipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  // --- Equipment ---

  @Post()
  @RequirePermissions('equipment:create')
  @ApiOperation({ summary: 'Create new equipment' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateEquipmentDto) {
    return this.equipmentService.create(tenant, dto);
  }

  @Get()
  @RequirePermissions('equipment:read')
  @ApiOperation({ summary: 'List organization equipment' })
  async findAll(@CurrentTenant() tenant: TenantContext, @Query() query: EquipmentQueryDto) {
    return this.equipmentService.findAll(tenant, query);
  }

  @Get(':id')
  @RequirePermissions('equipment:read')
  @ApiOperation({ summary: 'Get equipment details' })
  async findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.equipmentService.findOne(tenant, id);
  }

  @Patch(':id')
  @RequirePermissions('equipment:update')
  @ApiOperation({ summary: 'Update equipment' })
  async update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.equipmentService.update(tenant, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('equipment:delete')
  @ApiOperation({ summary: 'Archive equipment' })
  async delete(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.equipmentService.delete(tenant, id);
  }

  // --- Assignments ---

  @Post(':id/assignments')
  @RequirePermissions('equipment:assign')
  @ApiOperation({ summary: 'Assign equipment to project' })
  async createAssignment(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: AssignEquipmentDto) {
    return this.equipmentService.createAssignment(tenant, id, dto);
  }

  @Get(':id/assignments')
  @RequirePermissions('equipment:read')
  @ApiOperation({ summary: 'Get equipment project assignments' })
  async getAssignments(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.equipmentService.getEquipmentAssignments(tenant, id);
  }

  @Patch(':id/assignments/:assignmentId')
  @RequirePermissions('equipment:assign')
  @ApiOperation({ summary: 'Update or close equipment assignment' })
  async updateAssignment(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Param('assignmentId') assignmentId: string, @Body() dto: UpdateAssignmentDto) {
    return this.equipmentService.updateAssignment(tenant, id, assignmentId, dto);
  }
}

// Separate controller for project-centric lookups
@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('projects')
export class ProjectEquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get(':projectId/equipment')
  @RequirePermissions('equipment:read')
  @ApiOperation({ summary: 'Get equipment assigned to project' })
  async getProjectEquipment(@CurrentTenant() tenant: TenantContext, @Param('projectId') projectId: string) {
    return this.equipmentService.getProjectEquipment(tenant, projectId);
  }
}
