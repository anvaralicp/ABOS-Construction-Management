import { Controller, Post, Get, Body, UseGuards, Param, Delete, Put, Patch } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, AddMemberDto, ChangeRoleDto, UpdateOrganizationDto } from './dto/organization.dto';
import { UpdateOrganizationSettingsDto } from './dto/organization-settings.dto';
import { OrganizationSettingsService } from './organization-settings.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly orgService: OrganizationsService,
    private readonly settingsService: OrganizationSettingsService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  async create(@CurrentUser() user: any, @Body() dto: CreateOrganizationDto) {
    return this.orgService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List organizations the user belongs to' })
  async listUserOrganizations(@CurrentUser() user: any) {
    return this.orgService.listUserOrganizations(user.id);
  }

  // Routes below require explicit Tenant Context via Header
  
  @Get('current')
  @UseGuards(TenantGuard)
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Get details of the currently selected organization context' })
  async getCurrentOrganization(@CurrentTenant() tenant: TenantContext) {
    return this.orgService.getOrganization(tenant);
  }
  @Patch('current')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('organization:update')
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Update details of the currently selected organization context' })
  async updateCurrentOrganization(@CurrentTenant() tenant: TenantContext, @Body() dto: UpdateOrganizationDto) {
    return this.orgService.updateProfile(tenant, dto);
  }
  @Get('current/settings')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('organization:settings:read')
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Get settings of the currently selected organization context' })
  async getSettings(@CurrentTenant() tenant: TenantContext) {
    return this.settingsService.getSettings(tenant);
  }

  @Patch('current/settings')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('organization:settings:update')
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Update settings of the currently selected organization context' })
  async updateSettings(@CurrentTenant() tenant: TenantContext, @Body() dto: UpdateOrganizationSettingsDto) {
    return this.settingsService.updateSettings(tenant, dto);
  }



  @Get('members')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('organization:members:read')
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'List organization members' })
  async listMembers(@CurrentTenant() tenant: TenantContext) {
    return this.orgService.listMembers(tenant);
  }

  @Post('members')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('organization:members:write')
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Add a member to the organization' })
  async addMember(@CurrentTenant() tenant: TenantContext, @Body() dto: AddMemberDto) {
    return this.orgService.addMember(tenant, dto);
  }

  @Put('members/:id/role')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('organization:members:write')
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Change a member\'s role' })
  async changeMemberRole(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') memberId: string,
    @Body() dto: ChangeRoleDto
  ) {
    return this.orgService.changeMemberRole(tenant, memberId, dto);
  }

  @Delete('members/:id')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('organization:members:write')
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Remove a member from the organization' })
  async removeMember(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') memberId: string
  ) {
    return this.orgService.removeMember(tenant, memberId);
  }
}
