import sys
import re

def patch_service(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Add missing imports if necessary
    if "BadRequestException" not in content:
        content = content.replace("NotFoundException }", "NotFoundException, BadRequestException, ConflictException }")

    # Add validation method
    validation_code = """
  private async validateReferences(context: TenantContext, dto: CreateNotificationDto) {
    // Validate User
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organization_id: context.organizationId,
        user_id: dto.user_id,
        status: 'ACTIVE'
      }
    });
    if (!membership) {
      throw new BadRequestException('Recipient user does not belong to the organization or is not active.');
    }

    // Validate Project if provided
    if (dto.project_id) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: dto.project_id,
          organization_id: context.organizationId,
          deleted_at: null
        }
      });
      if (!project) {
        throw new BadRequestException('Project does not exist in this organization.');
      }
    }
  }
"""
    if "private async validateReferences" not in content:
        content = content.replace("async create(context: TenantContext, dto: CreateNotificationDto) {", validation_code + "\n  async create(context: TenantContext, dto: CreateNotificationDto) {")

    # Call validation in create and catch P2002 for dedup
    create_logic = """
  async create(context: TenantContext, dto: CreateNotificationDto) {
    await this.validateReferences(context, dto);

    const data = {
      organization_id: context.organizationId,
      user_id: dto.user_id,
      project_id: dto.project_id || null,
      type: dto.type,
      severity: dto.severity || 'INFO',
      title: dto.title,
      body: dto.body,
      metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : null,
      expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
      deduplication_key: dto.deduplication_key || null,
    };

    if (dto.deduplication_key) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          organization_id: context.organizationId,
          deduplication_key: dto.deduplication_key
        }
      });
      if (existing) return existing;
    }

    try {
      return await this.prisma.notification.create({ data });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('deduplication_key')) {
        // Race condition occurred, another process inserted the notification first
        const existing = await this.prisma.notification.findFirst({
          where: {
            organization_id: context.organizationId,
            deduplication_key: dto.deduplication_key
          }
        });
        if (existing) return existing;
      }
      throw error;
    }
  }
"""
    content = re.sub(r'  async create\(context: TenantContext, dto: CreateNotificationDto\) \{.*?return notification;\n  \}', create_logic.strip(), content, flags=re.DOTALL)

    # Call validation in createMany
    createMany_logic = """
  async createMany(context: TenantContext, dtos: CreateNotificationDto[]) {
    for (const dto of dtos) {
      await this.validateReferences(context, dto);
    }

    const data = dtos.map(dto => ({
      organization_id: context.organizationId,
      user_id: dto.user_id,
      project_id: dto.project_id || null,
      type: dto.type,
      severity: dto.severity || 'INFO',
      title: dto.title,
      body: dto.body,
      metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : null,
      expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
      deduplication_key: dto.deduplication_key || null,
    }));

    try {
      return await this.prisma.notification.createMany({ data, skipDuplicates: true });
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Partial unique index violation fallback
        return { count: 0 }; 
      }
      throw error;
    }
  }
"""
    content = re.sub(r'  async createMany\(context: TenantContext, dtos: CreateNotificationDto\[\]\) \{.*?\n  \}', createMany_logic.strip(), content, flags=re.DOTALL)

    # Add maximum limit in findAll
    limit_logic = """
    const page = parseInt(query.page || '1', 10);
    let limit = parseInt(query.limit || '50', 10);
    const MAX_PAGE_SIZE = 100;
    if (limit > MAX_PAGE_SIZE) {
      limit = MAX_PAGE_SIZE;
    }
    const skip = (page - 1) * limit;
"""
    content = re.sub(r'    const page = parseInt\(query\.page \|\| \'1\', 10\);\n    const limit = parseInt\(query\.limit \|\| \'50\', 10\);\n    const skip = \(page - 1\) \* limit;', limit_logic.strip(), content, flags=re.DOTALL)

    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_service(sys.argv[1])
