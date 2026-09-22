import { Test, TestingModule } from '@nestjs/testing';
import { TaxService } from './tax.service';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { AuditService } from '../../../infrastructure/audit/audit.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

const mockPrisma = {
  gstTaxConfig: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  expense: {
    groupBy: jest.fn(),
    findFirst: jest.fn(),
  },
  vendor: {
    findMany: jest.fn(),
  },
  project: {
    findMany: jest.fn(),
  }
};

const mockAudit = {
  log: jest.fn(),
};

const mockContext = {
  userId: 'user-1',
  organizationId: 'org-1',
  roles: ['admin']
};

describe('TaxService', () => {
  let service: TaxService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<TaxService>(TaxService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should create tax config', async () => {
      prisma.gstTaxConfig.findFirst.mockResolvedValue(null);
      prisma.gstTaxConfig.create.mockResolvedValue({ id: 'conf-1' });
      
      const res = await service.createConfig(mockContext, {
        name: 'GST 18',
        code: 'GST-18',
        rate_percentage: 18,
        cgst_rate: 9,
        sgst_rate: 9
      });
      
      expect(res.id).toBe('conf-1');
      expect(prisma.gstTaxConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organization_id: 'org-1',
            rate_percentage: expect.any(Decimal),
            cgst_rate: expect.any(Decimal),
          })
        })
      );
    });

    it('should reject creating active config with duplicate code', async () => {
      prisma.gstTaxConfig.findFirst.mockResolvedValue({ id: 'conf-2', is_active: true });
      await expect(service.createConfig(mockContext, {
        name: 'GST 18',
        code: 'GST-18',
        rate_percentage: 18
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid effective dates', async () => {
      await expect(service.createConfig(mockContext, {
        name: 'GST 18',
        rate_percentage: 18,
        effective_from: '2026-01-01',
        effective_to: '2025-01-01'
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject updating financial fields of a referenced config (Historical Integrity)', async () => {
      prisma.gstTaxConfig.findUnique.mockResolvedValue({ id: 'conf-1', organization_id: 'org-1', cgst_rate: new Decimal(9) });
      prisma.expense.findFirst.mockResolvedValue({ id: 'exp-1' });
      
      await expect(service.updateConfig(mockContext, 'conf-1', {
        name: 'GST 18 modified',
        cgst_rate: 10
      })).rejects.toThrow(ConflictException);
    });

    it('should allow updating non-financial fields of a referenced config', async () => {
      prisma.gstTaxConfig.findUnique.mockResolvedValue({ id: 'conf-1', organization_id: 'org-1', cgst_rate: new Decimal(9) });
      prisma.expense.findFirst.mockResolvedValue({ id: 'exp-1' });
      prisma.gstTaxConfig.update.mockResolvedValue({ id: 'conf-1', name: 'GST 18 renamed' });
      
      const res = await service.updateConfig(mockContext, 'conf-1', {
        name: 'GST 18 renamed'
      });
      
      expect(res.name).toBe('GST 18 renamed');
      expect(prisma.gstTaxConfig.update).toHaveBeenCalled();
    });
  });

  describe('Reports', () => {
    it('should compute summary correctly from historical expense fields', async () => {
      prisma.expense.groupBy.mockResolvedValue([
        { 
          tax_config_id: 'conf-1', 
          _sum: { taxable_amount: 1000, tax_amount: 180, cgst_amount: 90, sgst_amount: 90 }, 
          _count: 1 
        }
      ]);

      const res = await service.getSummaryReport(mockContext, { date_from: '2026-01-01' });
      expect(res.taxable_amount).toBe(1000);
      expect(res.tax_amount).toBe(180);
      expect(res.cgst_amount).toBe(90);
      expect(res.sgst_amount).toBe(90);
      expect(res.igst_amount).toBe(0);
      expect(res.cess_amount).toBe(0);
      expect(res.transaction_count).toBe(1);

      expect(prisma.expense.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organization_id: 'org-1',
            invoice_date: expect.any(Object),
            status: { notIn: ['DRAFT', 'REJECTED'] }
          })
        })
      );
    });
  });
});
