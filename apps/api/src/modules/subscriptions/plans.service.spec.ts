import { Test, TestingModule } from '@nestjs/testing';
import { PlansService } from './plans.service';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { AuditService } from '../../../infrastructure/audit/audit.service';
import { ConflictException } from '@nestjs/common';

describe('PlansService', () => {
  let service: PlansService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      subscriptionPlan: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      }
    };
    const mockAudit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should prevent duplicate entitlement keys in payload', async () => {
      await expect(service.create({ organizationId: 'org-1', userId: 'u1', roles: [] }, {
        code: 'TEST',
        name: 'Test Plan',
        price: 0,
        currency: 'USD',
        billing_cycle: 'MONTHLY',
        entitlements: [
          { feature_key: 'projects.max', type: 'INTEGER', value_int: 5 },
          { feature_key: 'projects.max', type: 'BOOLEAN', value_bool: true } // Duplicate!
        ]
      })).rejects.toThrow(ConflictException);
    });

    it('should gracefully handle database unique code collision', async () => {
      const err: any = new Error();
      err.code = 'P2002';
      err.meta = { target: ['code'] };
      prisma.subscriptionPlan.create.mockRejectedValue(err);

      await expect(service.create({ organizationId: 'org-1', userId: 'u1', roles: [] }, {
        code: 'TEST',
        name: 'Test Plan',
        price: 0,
        currency: 'USD',
        billing_cycle: 'MONTHLY'
      })).rejects.toThrow(ConflictException);
    });
  });
});
