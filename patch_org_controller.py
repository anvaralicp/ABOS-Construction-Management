import sys

def patch_controller(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Update imports
    old_imports = """import { Controller, Post, Get, Body, UseGuards, Param, Delete, Put } from '@nestjs/common';"""
    new_imports = """import { Controller, Post, Get, Body, UseGuards, Param, Delete, Put, Patch } from '@nestjs/common';"""
    content = content.replace(old_imports, new_imports)

    # 2. Add PATCH /organizations/current
    patch_route = """
  @Patch('current')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('organization:update')
  @ApiHeader({ name: 'x-organization-id', required: true })
  @ApiOperation({ summary: 'Update details of the currently selected organization context' })
  async updateCurrentOrganization(@CurrentTenant() tenant: TenantContext, @Body() dto: UpdateOrganizationDto) {
    return this.orgService.updateProfile(tenant, dto);
  }
"""
    if "updateCurrentOrganization" not in content:
        content = content.replace("async getCurrentOrganization(@CurrentTenant() tenant: TenantContext) {\n    return this.orgService.getOrganization(tenant);\n  }", "async getCurrentOrganization(@CurrentTenant() tenant: TenantContext) {\n    return this.orgService.getOrganization(tenant);\n  }" + patch_route)

    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_controller(sys.argv[1])
