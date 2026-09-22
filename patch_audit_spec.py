import sys

def patch_spec(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    old_mock = """    const mockPrisma = {
      auditEvent: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      }
    };"""
    new_mock = """    const mockPrisma = {
      auditEvent: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      }
    };"""
    content = content.replace(old_mock, new_mock)

    old_describe = """  describe('getDetail', () => {
    it('should throw NotFoundException if event does not exist', async () => {
      prisma.auditEvent.findUnique.mockResolvedValue(null);
      await expect(service.getDetail(ctx, 'evt-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if event belongs to another org (Tenant Isolation)', async () => {
      prisma.auditEvent.findUnique.mockResolvedValue({ organization_id: 'org-2' });
      await expect(service.getDetail(ctx, 'evt-1')).rejects.toThrow(NotFoundException);
    });

    it('should return event if it belongs to org', async () => {
      prisma.auditEvent.findUnique.mockResolvedValue({ organization_id: 'org-1', id: 'evt-1' });
      const res = await service.getDetail(ctx, 'evt-1');
      expect(res.id).toBe('evt-1');
    });
  });"""
    new_describe = """  describe('getDetail', () => {
    it('should query exactly within the organization context', async () => {
      prisma.auditEvent.findFirst.mockResolvedValue(null);
      await expect(service.getDetail(ctx, 'evt-1')).rejects.toThrow(NotFoundException);
      expect(prisma.auditEvent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'evt-1', organization_id: 'org-1' }
        })
      );
    });

    it('should throw NotFoundException if event does not exist (including cross-tenant event)', async () => {
      // Because findFirst looks for BOTH id and org-1, a cross-tenant event naturally returns null from DB
      prisma.auditEvent.findFirst.mockResolvedValue(null);
      await expect(service.getDetail(ctx, 'evt-1')).rejects.toThrow(NotFoundException);
    });

    it('should return event if it belongs to org', async () => {
      prisma.auditEvent.findFirst.mockResolvedValue({ organization_id: 'org-1', id: 'evt-1' });
      const res = await service.getDetail(ctx, 'evt-1');
      expect(res.id).toBe('evt-1');
    });
  });"""
    content = content.replace(old_describe, new_describe)

    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_spec(sys.argv[1])
