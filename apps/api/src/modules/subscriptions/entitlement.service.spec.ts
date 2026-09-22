import { Test, TestingModule } from '@nestjs/testing';
import { EntitlementService } from './entitlement.service';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { EntitlementType } from '@prisma/client';

describe('EntitlementService', () => {
  let service: EntitlementService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      subscription: { findFirst: jest.fn() },
      subscriptionPlan: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitlementService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EntitlementService>(EntitlementService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getCurrentSubscription', () => {
    it('should return null if trial is expired', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        status: 'TRIAL',
        trial_ends_at: new Date(Date.now() - 10000), // Expired 10 seconds ago
      });
      const res = await service.getCurrentSubscription('org-1');
      expect(res).toBeNull();
    });

    it('should return subscription if trial is not expired', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        status: 'TRIAL',
        trial_ends_at: new Date(Date.now() + 10000), // Expires in 10 seconds
      });
      const res = await service.getCurrentSubscription('org-1');
      expect(res).toBeDefined();
    });

    it('should return subscription if ACTIVE', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        status: 'ACTIVE',
      });
      const res = await service.getCurrentSubscription('org-1');
      expect(res).toBeDefined();
    });
  });

  describe('getEffectiveEntitlements', () => {
    it('should fallback to FREE plan if no active subscription exists', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.subscriptionPlan.findFirst.mockResolvedValue({
        code: 'FREE',
        entitlements: [{ feature_key: 'reports.enabled', type: 'BOOLEAN', value_bool: false }]
      });

      const res = await service.getEffectiveEntitlements('org-1');
      expect(res.length).toBe(1);
      expect(prisma.subscriptionPlan.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ code: 'FREE' })
      }));
    });
  });

  describe('has', () => {
    it('should return true if boolean entitlement is granted', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        status: 'ACTIVE',
        plan: {
          entitlements: [{ feature_key: 'reports.enabled', type: 'BOOLEAN', value_bool: true }]
        }
      });
      const res = await service.has('org-1', 'reports.enabled');
      expect(res).toBe(true);
    });

    it('should return false if boolean entitlement is missing or false', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        status: 'ACTIVE',
        plan: {
          entitlements: [{ feature_key: 'reports.enabled', type: 'BOOLEAN', value_bool: false }]
        }
      });
      const res = await service.has('org-1', 'reports.enabled');
      expect(res).toBe(false);
    });
  });

  describe('getNumber', () => {
    it('should return correct number', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        status: 'ACTIVE',
        plan: {
          entitlements: [{ feature_key: 'projects.max', type: 'INTEGER', value_int: 5 }]
        }
      });
      const res = await service.getNumber('org-1', 'projects.max');
      expect(res).toBe(5);
    });

    it('should return null if not integer type', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        status: 'ACTIVE',
        plan: {
          entitlements: [{ feature_key: 'projects.max', type: 'BOOLEAN', value_bool: true }]
        }
      });
      const res = await service.getNumber('org-1', 'projects.max');
      expect(res).toBeNull();
    });
  });

  describe('assertLimit', () => {
    it('should throw ForbiddenException if limit exceeded', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        status: 'ACTIVE',
        plan: {
          entitlements: [{ feature_key: 'projects.max', type: 'INTEGER', value_int: 5 }]
        }
      });
      await expect(service.assertLimit('org-1', 'projects.max', 5, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should resolve if within limit', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        status: 'ACTIVE',
        plan: {
          entitlements: [{ feature_key: 'projects.max', type: 'INTEGER', value_int: 5 }]
        }
      });
      await expect(service.assertLimit('org-1', 'projects.max', 4, 1)).resolves.toBeUndefined();
    });
  });
});
