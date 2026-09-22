import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      auditEvent: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  const ctx: TenantContext = {
    userId: 'u1',
    organizationId: 'org-1',
    roles: [],
    permissions: []
  };

  describe('list', () => {
    it('should query exactly within the organization context', async () => {
      prisma.auditEvent.findMany.mockResolvedValue([]);
      prisma.auditEvent.count.mockResolvedValue(0);

      await service.list(ctx, { page: 1, limit: 10 });

      expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organization_id: 'org-1' },
          skip: 0,
          take: 10,
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }]
        })
      );
    });

    it('should apply filters to Prisma query', async () => {
      prisma.auditEvent.findMany.mockResolvedValue([]);
      prisma.auditEvent.count.mockResolvedValue(0);

      await service.list(ctx, { 
        page: 2, 
        limit: 20,
        from: '2026-01-01T00:00:00Z',
        to: '2026-02-01T00:00:00Z',
        actorId: 'act-1',
        action: 'TEST',
        entityType: 'User',
        entityId: 'ent-1'
      });

      expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organization_id: 'org-1',
            created_at: {
              gte: new Date('2026-01-01T00:00:00Z'),
              lte: new Date('2026-02-01T00:00:00Z')
            },
            actor_id: 'act-1',
            action: 'TEST',
            entity_type: 'User',
            entity_id: 'ent-1'
          },
          skip: 20,
          take: 20,
        })
      );
    });
  });

  describe('getDetail', () => {
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
  });
});
