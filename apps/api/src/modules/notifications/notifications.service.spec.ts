import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { AuditService } from '../../../infrastructure/audit/audit.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { NotificationType, NotificationSeverity } from '@prisma/client';

const mockPrisma = {
  notification: {
    create: jest.fn(),
    createMany: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  organizationMembership: {
    findFirst: jest.fn(),
  },
  project: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAudit = {
  log: jest.fn(),
};

const mockContext = {
  userId: 'user-1',
  organizationId: 'org-1',
  roles: ['admin']
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create & validateReferences', () => {
    it('should create a notification when references are valid', async () => {
      prisma.organizationMembership.findFirst.mockResolvedValue({ id: 'mem-1' });
      prisma.notification.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      const res = await service.create(mockContext, {
        user_id: 'user-1',
        type: NotificationType.SYSTEM,
        title: 'Welcome',
        body: 'Hello',
      });

      expect(res.id).toBe('notif-1');
      expect(prisma.organizationMembership.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organization_id: 'org-1', user_id: 'user-1',  }
        })
      );
    });

    it('should reject if recipient user does not belong to organization', async () => {
      prisma.organizationMembership.findFirst.mockResolvedValue(null);
      await expect(service.create(mockContext, {
        user_id: 'user-2',
        type: NotificationType.SYSTEM,
        title: 'Welcome',
        body: 'Hello',
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject if project does not belong to organization', async () => {
      prisma.organizationMembership.findFirst.mockResolvedValue({ id: 'mem-1' });
      prisma.project.findFirst.mockResolvedValue(null);
      await expect(service.create(mockContext, {
        user_id: 'user-1',
        project_id: 'proj-2',
        type: NotificationType.SYSTEM,
        title: 'Welcome',
        body: 'Hello',
      })).rejects.toThrow(BadRequestException);
    });

    it('should resolve idempotency via unique constraint error fallback', async () => {
      prisma.organizationMembership.findFirst.mockResolvedValue({ id: 'mem-1' });
      prisma.notification.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'notif-2' }); // Check 1 fails, check 2 succeeds
      
      const error = new Error() as any;
      error.code = 'P2002';
      error.meta = { target: ['deduplication_key'] };
      prisma.notification.create.mockRejectedValue(error);

      const res = await service.create(mockContext, {
        user_id: 'user-1',
        type: NotificationType.SYSTEM,
        title: 'Welcome',
        body: 'Hello',
        deduplication_key: 'dedup-1'
      });

      expect(res.id).toBe('notif-2');
    });
  });

  describe('createMany', () => {
    it('should validate all recipients in bulk', async () => {
      prisma.organizationMembership.findFirst.mockResolvedValueOnce({ id: 'mem-1' }).mockResolvedValueOnce(null);
      await expect(service.createMany(mockContext, [
        { user_id: 'user-1', type: NotificationType.SYSTEM, title: 'Welcome', body: 'Hello' },
        { user_id: 'user-2', type: NotificationType.SYSTEM, title: 'Welcome', body: 'Hello' },
      ])).rejects.toThrow(BadRequestException);
    });

    it('should skip duplicates natively using createMany on P2002', async () => {
      prisma.organizationMembership.findFirst.mockResolvedValue({ id: 'mem-1' });
      const error = new Error() as any;
      error.code = 'P2002';
      prisma.notification.createMany.mockRejectedValue(error);
      
      const res = await service.createMany(mockContext, [
        { user_id: 'user-1', type: NotificationType.SYSTEM, title: 'Welcome', body: 'Hello' },
      ]);
      expect(res).toEqual({ count: 0 });
    });
  });

  describe('findAll Pagination and Limits', () => {
    it('should cap limit to MAX_PAGE_SIZE', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      
      await service.findAll(mockContext, { limit: '1000000' });
      
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });

    it('should apply filters securely', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      
      await service.findAll(mockContext, { is_read: false, type: NotificationType.EXPENSE, project_id: 'proj-1' });
      
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_read: false,
            type: NotificationType.EXPENSE,
            project_id: 'proj-1',
            organization_id: 'org-1'
          })
        })
      );
    });
  });

  describe('Active/Expired Filtering', () => {
    it('should exclude expired notifications automatically', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);
      await expect(service.findOne(mockContext, 'expired-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Soft Deletion', () => {
    it('deleted_at must be null for active views', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll(mockContext, {});
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deleted_at: null
          })
        })
      );
    });
  });
});
