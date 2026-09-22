import { Test, TestingModule } from '@nestjs/testing';
import { VendorPaymentsService } from './vendor-payments.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';

describe('VendorPaymentsService', () => {
  let service: VendorPaymentsService;
  let prisma: any;
  let audit: any;
  let mockContext: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (callback) => {
        return callback(prisma);
      }),
      vendor: {
        findUnique: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
      expense: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        aggregate: jest.fn(),
      },
      vendorPayment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        aggregate: jest.fn(),
        count: jest.fn(),
      },
    };

    audit = {
      logEvent: jest.fn(),
    };

    mockContext = {
      organizationId: 'org-1',
      userId: 'user-1',
      permissions: ['vendor_payments:read', 'vendor_payments:write', 'vendor_payments:delete', 'vendor_payments:summary'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorPaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<VendorPaymentsService>(VendorPaymentsService);
  });

  describe('Payment Creation & Allocation', () => {
    it('should create an unallocated payment successfully', async () => {
      prisma.vendor.findUnique.mockResolvedValue({ id: 'ven-1', deleted_at: null });
      prisma.vendorPayment.create.mockResolvedValue({ id: 'pay-1', amount: 50000 });

      const dto = {
        vendor_id: 'ven-1',
        amount: 50000,
        currency: 'INR',
        payment_date: '2026-01-01T00:00:00Z',
        payment_method: PaymentMethod.BANK_TRANSFER,
      };

      const result = await service.create(mockContext, dto);
      expect(prisma.vendorPayment.create).toHaveBeenCalled();
      expect(result.id).toEqual('pay-1');
    });

    it('should reject payment if it exceeds expense outstanding balance', async () => {
      prisma.vendor.findUnique.mockResolvedValue({ id: 'ven-1', deleted_at: null });
      prisma.expense.findFirst.mockResolvedValue({ id: 'exp-1', total_amount: 100000, vendor_id: 'ven-1' });
      // Already paid 60,000. Outstanding is 40,000.
      prisma.vendorPayment.aggregate.mockResolvedValue({ _sum: { amount: 60000 } });

      const dto = {
        vendor_id: 'ven-1',
        expense_id: 'exp-1',
        amount: 50000, // 50,000 > 40,000 outstanding
        currency: 'INR',
        payment_date: '2026-01-01T00:00:00Z',
      };

      await expect(service.create(mockContext, dto)).rejects.toThrow(BadRequestException);
      expect(prisma.vendorPayment.create).not.toHaveBeenCalled();
    });

    it('should reject payment if vendor mismatch with expense', async () => {
      prisma.vendor.findUnique.mockResolvedValue({ id: 'ven-1', deleted_at: null });
      prisma.expense.findFirst.mockResolvedValue({ id: 'exp-1', total_amount: 100000, vendor_id: 'ven-2' }); // Mismatch

      const dto = {
        vendor_id: 'ven-1',
        expense_id: 'exp-1',
        amount: 50000,
        currency: 'INR',
        payment_date: '2026-01-01T00:00:00Z',
      };

      await expect(service.create(mockContext, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Payment Concurrency', () => {
    it('should reject update if version is stale', async () => {
      prisma.vendorPayment.findFirst.mockResolvedValue({ id: 'pay-1', version: 2 });
      await expect(service.update(mockContext, 'pay-1', { version: 1 })).rejects.toThrow(ConflictException);
    });

    it('should successfully update and increment version', async () => {
      prisma.vendorPayment.findFirst.mockResolvedValue({ id: 'pay-1', version: 1, amount: 500 });
      prisma.vendorPayment.update.mockResolvedValue({ id: 'pay-1', version: 2, amount: 600 });

      await service.update(mockContext, 'pay-1', { version: 1, amount: 600 });
      expect(prisma.vendorPayment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ version: { increment: 1 } })
      }));
    });
  });

  describe('Settlement Summaries', () => {
    it('should calculate expense settlement correctly', async () => {
      prisma.expense.findFirst.mockResolvedValue({ id: 'exp-1', total_amount: 100000, currency: 'INR' });
      prisma.vendorPayment.findMany.mockResolvedValue([
        { amount: 20000, status: PaymentStatus.COMPLETED },
        { amount: 30000, status: PaymentStatus.PENDING }, // Included in paid
        { amount: 10000, status: PaymentStatus.FAILED }, // Ignored
      ]);

      const summary = await service.getExpenseSettlementSummary(mockContext, 'exp-1');
      
      expect(summary.total_amount).toEqual(100000);
      expect(summary.total_paid).toEqual(50000); // 20k + 30k
      expect(summary.outstanding_amount).toEqual(50000);
      expect(summary.is_fully_paid).toBe(false);
    });

    it('should calculate vendor overall settlement correctly', async () => {
      prisma.vendor.findUnique.mockResolvedValue({ id: 'ven-1', name: 'Vendor A' });
      prisma.expense.aggregate.mockResolvedValue({ _sum: { total_amount: 500000 } });
      prisma.vendorPayment.aggregate.mockResolvedValue({ _sum: { amount: 300000 } });

      const summary = await service.getVendorSettlementSummary(mockContext, 'ven-1');

      expect(summary.total_expense_amount).toEqual(500000);
      expect(summary.total_paid).toEqual(300000);
      expect(summary.outstanding_amount).toEqual(200000);
    });
  });
});
