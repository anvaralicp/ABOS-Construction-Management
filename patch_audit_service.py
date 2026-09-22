import sys

def patch_service(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    old_query = """  async getDetail(context: TenantContext, id: string) {
    const event = await this.prisma.auditEvent.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            status: true,
          }
        }
      }
    });

    if (!event || event.organization_id !== context.organizationId) {
      throw new NotFoundException('Audit event not found');
    }"""
    
    new_query = """  async getDetail(context: TenantContext, id: string) {
    const event = await this.prisma.auditEvent.findFirst({
      where: {
        id,
        organization_id: context.organizationId,
      },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            status: true,
          }
        }
      }
    });

    if (!event) {
      throw new NotFoundException('Audit event not found');
    }"""
    
    content = content.replace(old_query, new_query)

    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_service(sys.argv[1])
