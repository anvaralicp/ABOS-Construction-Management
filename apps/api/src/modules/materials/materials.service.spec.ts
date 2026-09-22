import { Test, TestingModule } from '@nestjs/testing';
import { MaterialsService } from './materials.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { MaterialStatus } from '@prisma/client';

describe('MaterialsService', () => {
  let service: MaterialsService;
  let prisma: any;
  let audit: any;
  let mockContext: any;

  beforeEach(async () => {
    prisma = {
      material: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      materialRate: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      vendor: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    audit = {
      logEvent: jest.fn(),
    };

    mockContext = {
      organizationId: 'org-1',
      userId: 'user-1',
      permissions: ['materials:read', 'materials:write', 'materials:delete', 'material_rates:write', 'material_rates:read'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
  });

  describe('Material Master CRUD', () => {
    it('should create material', async () => {
      prisma.material.findUnique.mockResolvedValue(null);
      prisma.material.create.mockResolvedValue({ id: 'mat-1', name: 'Cement' });

      const dto = { name: 'Cement', code: 'CEMENT', unit_of_measure: 'bags', status: MaterialStatus.ACTIVE };
      const result = await service.create(mockContext, dto);

      expect(prisma.material.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: 'Cement', code: 'CEMENT' })
      }));
      expect(result.id).toEqual('mat-1');
      expect(audit.logEvent).toHaveBeenCalled();
    });

    it('should reject duplicate material code', async () => {
      prisma.material.findUnique.mockResolvedValue({ id: 'mat-1' });
      await expect(service.create(mockContext, { name: 'Test', code: 'DUP', unit_of_measure: 'kg' }))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('Material Rates', () => {
    it('should create a rate for active material', async () => {
      prisma.material.findUnique.mockResolvedValue({ id: 'mat-1', status: 'ACTIVE', deleted_at: null });
      prisma.vendor.findUnique.mockResolvedValue({ id: 'ven-1', status: 'ACTIVE', deleted_at: null });
      prisma.materialRate.create.mockResolvedValue({ id: 'rate-1' });

      const dto = { vendor_id: 'ven-1', rate: 1500, currency: 'INR', effective_date: '2026-01-01T00:00:00Z' };
      const result = await service.createRate(mockContext, 'mat-1', dto);

      expect(prisma.materialRate.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ material_id: 'mat-1', vendor_id: 'ven-1', rate: 1500 })
      }));
      expect(result.id).toEqual('rate-1');
    });

    it('should reject rate if material is inactive', async () => {
      prisma.material.findUnique.mockResolvedValue({ id: 'mat-1', status: 'INACTIVE', deleted_at: null });
      
      const dto = { rate: 1500, currency: 'INR', effective_date: '2026-01-01T00:00:00Z' };
      await expect(service.createRate(mockContext, 'mat-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should retrieve latest effective rate', async () => {
      prisma.material.findUnique.mockResolvedValue({ id: 'mat-1', deleted_at: null });
      prisma.materialRate.findFirst.mockResolvedValue({ id: 'rate-2', rate: 1600 });

      const result = await service.getLatestRate(mockContext, 'mat-1', 'ven-1');

      expect(prisma.materialRate.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ material_id: 'mat-1', vendor_id: 'ven-1' }),
        orderBy: { effective_date: 'desc' }
      }));
      expect(result?.rate).toEqual(1600);
    });
  });
});
