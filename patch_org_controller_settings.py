import sys

def patch_controller_settings(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Update imports
    old_imports = """import { CreateOrganizationDto, AddMemberDto, ChangeRoleDto, UpdateOrganizationDto } from './dto/organization.dto';"""
    new_imports = """import { CreateOrganizationDto, AddMemberDto, ChangeRoleDto, UpdateOrganizationDto } from './dto/organization.dto';
import { UpdateOrganizationSettingsDto } from './dto/organization-settings.dto';
import { OrganizationSettingsService } from './organization-settings.service';"""
    content = content.replace(old_imports, new_imports)

    # 2. Inject the service
    old_constructor = """  constructor(private readonly orgService: OrganizationsService) {}"""
    new_constructor = """  constructor(
    private readonly orgService: OrganizationsService,
    private readonly settingsService: OrganizationSettingsService
  ) {}"""
    content = content.replace(old_constructor, new_constructor)

    # 3. Add settings routes
    settings_routes = """
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
"""
    if "async getSettings" not in content:
        content = content.replace("async updateCurrentOrganization(@CurrentTenant() tenant: TenantContext, @Body() dto: UpdateOrganizationDto) {\n    return this.orgService.updateProfile(tenant, dto);\n  }", "async updateCurrentOrganization(@CurrentTenant() tenant: TenantContext, @Body() dto: UpdateOrganizationDto) {\n    return this.orgService.updateProfile(tenant, dto);\n  }" + settings_routes)

    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_controller_settings(sys.argv[1])
