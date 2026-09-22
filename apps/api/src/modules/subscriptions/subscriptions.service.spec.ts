import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { AuditService } from '../../../infrastructure/audit/audit.service';
import { EntitlementService } from './entitlement.service';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    const mockPrisma = {
      subscription: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      }
    };
    const mockAudit = { log: jest.fn() };
    const mockEntitlement = {
      getCurrentSubscription: jest.fn(),
      getEffectiveEntitlements: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: EntitlementService, useValue: mockEntitlement },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    prisma = module.get<PrismaService>(PrismaService);
    audit = module.get<AuditService>(AuditService);
  });

  describe('create', () => {
    it('should prevent overlapping current_period_end before start', async () => {
      await expect(service.create({ organizationId: 'org-1', userId: 'u1', roles: [] }, {
        organization_id: 'org-1',
        plan_id: 'plan-1',
        status: 'ACTIVE',
        current_period_start: '2026-02-01T00:00:00Z',
        current_period_end: '2026-01-01T00:00:00Z'
      })).rejects.toThrow(BadRequestException);
    });

    it('should handle P2002 partial unique conflict gracefully', async () => {
      const err: any = new Error();
      err.code = 'P2002';
      err.meta = { target: ['subscriptions_org_active_idx'] };
      prisma.subscription.create.mockRejectedValue(err);

      await expect(service.create({ organizationId: 'org-1', userId: 'u1', roles: [] }, {
        organization_id: 'org-1',
        plan_id: 'plan-1',
        status: 'ACTIVE'
      })).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStatus', () => {
    it('should reject invalid transitions (e.g., EXPIRED -> ACTIVE)', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ id: 'sub-1', status: 'EXPIRED' });
      await expect(service.updateStatus({ organizationId: 'org-1', userId: 'u1', roles: [] }, 'sub-1', {
        status: 'ACTIVE'
      })).rejects.toThrow(BadRequestException);
    });

    it('should set cancelled_at when cancelling', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ id: 'sub-1', status: 'ACTIVE' });
      prisma.subscription.update.mockResolvedValue({ id: 'sub-1', status: 'CANCELLED' });

      await service.updateStatus({ organizationId: 'org-1', userId: 'u1', roles: [] }, 'sub-1', {
        status: 'CANCELLED'
      });

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cancelled_at: expect.any(Date) })
        })
      );
    });
  });
});
