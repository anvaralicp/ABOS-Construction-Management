import sys

def patch_organizations_service(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Update imports
    old_imports = """import { CreateOrganizationDto, AddMemberDto, ChangeRoleDto } from './dto/organization.dto';"""
    new_imports = """import { CreateOrganizationDto, AddMemberDto, ChangeRoleDto, UpdateOrganizationDto } from './dto/organization.dto';"""
    content = content.replace(old_imports, new_imports)

    # 2. Update create to add settings
    old_create = """      const newOrg = await tx.organization.create({
        data: { name: dto.name },
      });

      await tx.organizationMembership.create({"""
    new_create = """      const newOrg = await tx.organization.create({
        data: { name: dto.name },
      });

      await tx.organizationSettings.create({
        data: {
          organization_id: newOrg.id,
          timezone: 'UTC',
          currency: 'INR',
          locale: 'en-IN',
          date_format: 'DD/MM/YYYY',
          number_format: 'IN',
          week_start: 'MONDAY',
        }
      });

      await tx.organizationMembership.create({"""
    if "tx.organizationSettings.create" not in content:
        content = content.replace(old_create, new_create)

    # 3. Add updateProfile
    new_update_profile = """
  async updateProfile(context: TenantContext, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.update({
      where: { id: context.organizationId },
      data: {
        name: dto.name,
        legal_name: dto.legal_name,
        code: dto.code,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
      }
    });

    await this.audit.logEvent(context, {
      action: 'ORG_PROFILE_UPDATE',
      entityType: 'Organization',
      entityId: org.id,
      metadata: { fields: Object.keys(dto) }
    });

    return org;
  }
"""
    if "async updateProfile" not in content:
        content = content.replace("async getOrganization(context: TenantContext) {", new_update_profile + "\n  async getOrganization(context: TenantContext) {")

    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_organizations_service(sys.argv[1])
