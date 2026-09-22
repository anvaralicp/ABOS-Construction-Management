import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ExpenseStatus, PaymentStatus } from '@prisma/client';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let prisma: any;
  let audit: any;
  let mockContext: any;

  beforeEach(async () => {
    prisma = {
      expense: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
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
      permissions: ['expenses:read', 'expenses:write', 'expenses:delete'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
  });

  describe('Creation & Validation', () => {
    beforeEach(() => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', deleted_at: null });
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', deleted_at: null, is_active: true });
      prisma.vendor.findUnique.mockResolvedValue({ id: 'ven-1', deleted_at: null, status: 'ACTIVE' });
    });

    it('should calculate financials correctly and create expense', async () => {
      prisma.expense.findUnique.mockResolvedValue(null);
      prisma.expense.create.mockResolvedValue({ id: 'exp-1', total_amount: 11800 });

      const dto = {
        project_id: 'proj-1',
        category_id: 'cat-1',
        vendor_id: 'ven-1',
        item: 'Cement',
        quantity: 10,
        unit: 'bags',
        unit_price: 1000, // 1000 minor units
        tax_rate: 18, // 18%
        currency: 'INR',
      };

      const result = await service.create(mockContext, dto);

      expect(prisma.expense.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 10000,
          taxable_amount: 10000,
          tax_amount: 1800,
          total_amount: 11800,
        })
      }));
      expect(result.id).toEqual('exp-1');
      expect(audit.logEvent).toHaveBeenCalled();
    });

    it('should reject client subtotal mismatch', async () => {
      const dto = {
        project_id: 'proj-1',
        category_id: 'cat-1',
        item: 'Cement',
        quantity: 10,
        unit_price: 1000,
        tax_rate: 0,
        currency: 'INR',
        subtotal: 5000, // Client providing wrong calculation
      };
      await expect(service.create(mockContext, dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid project', async () => {
      prisma.project.findUnique.mockResolvedValue(null); // Project not found in org
      await expect(service.create(mockContext, {
        project_id: 'proj-1', category_id: 'cat-1', item: 'Test', quantity: 1, unit_price: 1, tax_rate: 0, currency: 'INR'
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('Concurrency & Update', () => {
    it('should reject stale version updates', async () => {
      prisma.expense.findUnique.mockResolvedValue({
        id: 'exp-1',
        project_id: 'proj-1',
        category_id: 'cat-1',
        quantity: 10,
        unit_price: 100,
        tax_rate: 0,
        version: 2, // Server has version 2
      });

      await expect(service.update(mockContext, 'exp-1', { version: 1 }))
        .rejects.toThrow(ConflictException);
    });

    it('should update correctly with valid version increment', async () => {
      prisma.expense.findUnique.mockResolvedValue({
        id: 'exp-1',
        project_id: 'proj-1',
        category_id: 'cat-1',
        quantity: 10,
        unit_price: 100,
        tax_rate: 0,
        version: 1,
        deleted_at: null,
      });

      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', deleted_at: null });
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', deleted_at: null, is_active: true });
      
      prisma.expense.updateMany.mockResolvedValue({ count: 1 }); // Atomic CAS succeeds

      await service.update(mockContext, 'exp-1', { version: 1, quantity: 20 });
      
      expect(prisma.expense.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'exp-1', organization_id: 'org-1', version: 1 },
        data: expect.objectContaining({ version: { increment: 1 }, quantity: 20 })
      }));
    });
  });
});
