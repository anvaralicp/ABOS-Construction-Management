import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsService } from './budgets.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { BudgetStatus } from '@prisma/client';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let prisma: any;
  let audit: any;
  let mockContext: any;

  beforeEach(async () => {
    prisma = {
      budget: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      budgetLine: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      expense: {
        groupBy: jest.fn(),
      },
    };

    audit = {
      logEvent: jest.fn(),
    };

    mockContext = {
      organizationId: 'org-1',
      userId: 'user-1',
      permissions: ['budgets:read', 'budgets:write', 'budgets:delete', 'budgets:summary'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
  });

  describe('Budget Creation', () => {
    it('should create budget successfully', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', deleted_at: null });
      prisma.category.findMany.mockResolvedValue([{ id: 'cat-1' }]);
      prisma.budget.create.mockResolvedValue({ id: 'budg-1', project_id: 'proj-1', total_amount: 100000 });

      const dto = {
        project_id: 'proj-1',
        total_amount: 100000,
        currency: 'INR',
        lines: [{ category_id: 'cat-1', amount: 50000, currency: 'INR' }]
      };

      const result = await service.create(mockContext, dto);
      expect(prisma.budget.create).toHaveBeenCalled();
      expect(result.id).toEqual('budg-1');
      expect(audit.logEvent).toHaveBeenCalled();
    });

    it('should fail if project is invalid', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(service.create(mockContext, { project_id: 'proj-1', total_amount: 100, currency: 'USD' })).rejects.toThrow(BadRequestException);
    });

    it('should fail if categories are cross-tenant', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', deleted_at: null });
      prisma.category.findMany.mockResolvedValue([]); // Category from another org
      
      const dto = {
        project_id: 'proj-1',
        total_amount: 100,
        currency: 'USD',
        lines: [{ category_id: 'cat-foreign', amount: 50, currency: 'USD' }]
      };

      await expect(service.create(mockContext, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Budget Summary & Calculation', () => {
    it('should calculate variance and utilization properly', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        id: 'budg-1',
        project_id: 'proj-1',
        total_amount: 100000,
        currency: 'INR',
        lines: [
          { category_id: 'cat-1', amount: 40000, category: { name: 'Labor' } },
          { category_id: 'cat-2', amount: 60000, category: { name: 'Materials' } }
        ]
      });

      // Expense group by returns aggregated sums
      prisma.expense.groupBy.mockResolvedValue([
        { category_id: 'cat-1', _sum: { total_amount: 30000 } }, // Under budget
        { category_id: 'cat-2', _sum: { total_amount: 70000 } }, // Over budget
        { category_id: 'cat-unbudgeted', _sum: { total_amount: 5000 } } // Unbudgeted
      ]);

      prisma.category.findUnique.mockResolvedValue({ name: 'Permits' }); // For unbudgeted

      const summary = await service.getSummary(mockContext, 'budg-1');
      
      expect(summary.totals.budgeted).toEqual(100000);
      expect(summary.totals.actual).toEqual(105000); // 30k + 70k + 5k
      expect(summary.totals.remaining).toEqual(-5000);
      expect(summary.totals.variance).toEqual(-5000);
      expect(summary.totals.utilization).toEqual(105);

      const laborLine = summary.breakdown.find(b => b.category_id === 'cat-1');
      expect(laborLine.actual).toEqual(30000);
      expect(laborLine.utilization).toEqual(75);
      expect(laborLine.is_unbudgeted).toEqual(false);

      const unbudgetedLine = summary.breakdown.find(b => b.category_id === 'cat-unbudgeted');
      expect(unbudgetedLine.actual).toEqual(5000);
      expect(unbudgetedLine.variance).toEqual(-5000);
      expect(unbudgetedLine.is_unbudgeted).toEqual(true);
    });
  });

  describe('Budget Concurrency', () => {
    it('should reject stale updates', async () => {
      prisma.budget.findFirst.mockResolvedValue({ id: 'b-1', version: 2 });
      await expect(service.update(mockContext, 'b-1', { version: 1 })).rejects.toThrow(ConflictException);
    });

    it('should increment version successfully', async () => {
      prisma.budget.findFirst.mockResolvedValue({ id: 'b-1', version: 1 });
      prisma.budget.updateMany.mockResolvedValue({ count: 1 });

      await service.update(mockContext, 'b-1', { version: 1, total_amount: 200000 });
      expect(prisma.budget.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ version: 1 }),
        data: expect.objectContaining({ version: { increment: 1 } })
      }));
    });
  });
});
