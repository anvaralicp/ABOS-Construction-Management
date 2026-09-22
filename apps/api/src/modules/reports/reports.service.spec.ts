import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;
  let mockContext: TenantContext;

  beforeEach(async () => {
    prisma = {
      project: {
        findFirst: jest.fn(),
      },
      budgetLine: {
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      expense: {
        aggregate: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      vendorPayment: {
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      dailyAttendance: {
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      projectWorkforceAssignment: {
        count: jest.fn(),
      },
      projectEquipmentAssignment: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      equipment: {
        groupBy: jest.fn(),
      },
      progressReport: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      category: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      vendor: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    mockContext = {
      organizationId: 'org-1',
      userId: 'user-1',
      permissions: ['reports:read', 'reports:project-summary', 'reports:financial', 'reports:expenses', 'reports:budget', 'reports:workforce', 'reports:vendors', 'reports:progress'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('Project Summary & Financial Summary', () => {
    it('should reject if project not found or inaccessible', async () => {
      prisma.project.findFirst.mockResolvedValue(null);
      await expect(service.getProjectSummary(mockContext, { project_id: 'proj-1' })).rejects.toThrow(NotFoundException);
    });

    it('should return financial summary accurately including zeros when no data', async () => {
      prisma.budgetLine.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.expense.aggregate.mockResolvedValueOnce({ _sum: { total_amount: null } });
      prisma.expense.groupBy.mockResolvedValueOnce([]);
      prisma.vendorPayment.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.vendorPayment.groupBy.mockResolvedValueOnce([]);

      const result = await service.getFinancialSummary(mockContext, 'proj-1');
      expect(result).toEqual({
        budget_total: 0,
        actual_expense_total: 0,
        paid_to_vendors: 0,
        outstanding_vendor_amount: 0,
        variance: 0,
      });
    });

    it('should return correct financial math', async () => {
      prisma.budgetLine.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });
      prisma.expense.aggregate.mockResolvedValueOnce({ _sum: { total_amount: 800 } }); // All expenses
      prisma.expense.groupBy.mockResolvedValueOnce([{ vendor_id: 'v1', _sum: { total_amount: 800 } }]);
      prisma.vendorPayment.aggregate.mockResolvedValue({ _sum: { amount: 500 } });
      prisma.vendorPayment.groupBy.mockResolvedValueOnce([{ vendor_id: 'v1', _sum: { amount: 500 } }]);

      const result = await service.getFinancialSummary(mockContext, 'proj-1');
      expect(result).toEqual({
        budget_total: 1000,
        actual_expense_total: 800,
        paid_to_vendors: 500,
        outstanding_vendor_amount: 300,
        variance: 200,
      });
    });

    it('should calculate outstanding_vendor_amount per vendor correctly', async () => {
      prisma.budgetLine.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      prisma.expense.aggregate.mockResolvedValueOnce({ _sum: { total_amount: 40000 } });
      
      // Vendor A: 10000 expense, 15000 payment -> 0 outstanding
      // Vendor B: 20000 expense, 0 payment -> 20000 outstanding
      // Vendor C: 10000 expense, 5000 payment -> 5000 outstanding
      // Total Outstanding should be 25000, not (40000 - 20000 = 20000)
      
      prisma.expense.groupBy.mockResolvedValueOnce([
        { vendor_id: 'vA', _sum: { total_amount: 10000 } },
        { vendor_id: 'vB', _sum: { total_amount: 20000 } },
        { vendor_id: 'vC', _sum: { total_amount: 10000 } },
      ]);
      prisma.vendorPayment.aggregate.mockResolvedValue({ _sum: { amount: 20000 } });
      prisma.vendorPayment.groupBy.mockResolvedValueOnce([
        { vendor_id: 'vA', _sum: { amount: 15000 } },
        { vendor_id: 'vC', _sum: { amount: 5000 } },
      ]);

      const result = await service.getFinancialSummary(mockContext, 'proj-1');
      expect(result.outstanding_vendor_amount).toBe(25000);
      expect(result.paid_to_vendors).toBe(20000);
      expect(result.actual_expense_total).toBe(40000);
    });

    it('should return combined project dashboard', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'proj-1', name: 'Test', code: 'T1' });
      prisma.budgetLine.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });
      prisma.expense.aggregate.mockResolvedValueOnce({ _sum: { total_amount: 800 } }); // All
      prisma.expense.groupBy.mockResolvedValueOnce([{ vendor_id: 'v1', _sum: { total_amount: 800 } }]);
      prisma.vendorPayment.aggregate.mockResolvedValue({ _sum: { amount: 500 } });
      prisma.vendorPayment.groupBy.mockResolvedValueOnce([{ vendor_id: 'v1', _sum: { amount: 500 } }]);
      
      prisma.expense.count.mockResolvedValue(5);
      prisma.dailyAttendance.count.mockResolvedValue(10);
      prisma.projectWorkforceAssignment.count.mockResolvedValue(3);
      prisma.projectEquipmentAssignment.count.mockResolvedValue(2);
      prisma.progressReport.count.mockResolvedValue(1);
      prisma.progressReport.findFirst.mockResolvedValue({ report_date: new Date('2026-01-01'), summary: 'ok' });

      const result = await service.getProjectSummary(mockContext, { project_id: 'proj-1' });
      expect(result.financial.variance).toBe(200);
      expect(result.expenses.count).toBe(5);
      expect(result.workforce.assigned).toBe(3);
      expect(result.equipment.assigned).toBe(2);
      expect(result.progress.report_count).toBe(1);
    });

    it('should pass correct security filters to financial queries', async () => {
      prisma.budgetLine.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      prisma.expense.aggregate.mockResolvedValue({ _sum: { total_amount: 0 } });
      prisma.expense.groupBy.mockResolvedValue([]);
      prisma.vendorPayment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      prisma.vendorPayment.groupBy.mockResolvedValue([]);
      
      await service.getFinancialSummary(mockContext, 'proj-1');
      
      expect(prisma.expense.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organization_id: 'org-1',
            project_id: 'proj-1',
            deleted_at: null,
            status: { notIn: ['DRAFT', 'REJECTED'] }
          })
        })
      );
    });

    it('should use invoice_date instead of created_at for Expense date filtering', async () => {
      prisma.budgetLine.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      prisma.expense.aggregate.mockResolvedValue({ _sum: { total_amount: 0 } });
      prisma.expense.groupBy.mockResolvedValue([]);
      prisma.vendorPayment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      prisma.vendorPayment.groupBy.mockResolvedValue([]);
      prisma.project.findFirst.mockResolvedValue({ id: 'proj-1', name: 'Test', code: 'T1' });
      
      const date_from = '2026-01-01';
      const date_to = '2026-01-31';

      await service.getFinancialSummary(mockContext, 'proj-1', date_from, date_to);
      expect(prisma.expense.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice_date: expect.any(Object)
          })
        })
      );
      
      // Reset mocks to ensure clean call tracking
      jest.clearAllMocks();
      prisma.expense.aggregate.mockResolvedValue({ _sum: { total_amount: 0 }, _count: 0 });
      prisma.expense.findMany.mockResolvedValue([]);
      prisma.expense.groupBy.mockResolvedValue([]);
      prisma.vendor.findMany.mockResolvedValue([]);
      prisma.category.findMany.mockResolvedValue([]);
      
      await service.getExpensesReport(mockContext, { date_from, date_to });
      expect(prisma.expense.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice_date: expect.any(Object)
          })
        })
      );

      jest.clearAllMocks();
      prisma.expense.groupBy.mockResolvedValue([]);
      prisma.vendorPayment.groupBy.mockResolvedValue([]);
      prisma.vendor.findMany.mockResolvedValue([]);

      await service.getVendorsReport(mockContext, { date_from, date_to });
      expect(prisma.expense.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice_date: expect.any(Object)
          })
        })
      );
    });
  });

  describe('Budget Report', () => {
    it('should return budget variance per category safely without NaN', async () => {
      prisma.budgetLine.groupBy.mockResolvedValue([
        { category_id: 'cat-1', _sum: { amount: 0 } },
        { category_id: 'cat-2', _sum: { amount: 1000 } }
      ]);
      prisma.expense.groupBy.mockResolvedValue([
        { category_id: 'cat-1', _sum: { total_amount: 500 } },
        { category_id: 'cat-2', _sum: { total_amount: 500 } }
      ]);
      prisma.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Materials' },
        { id: 'cat-2', name: 'Labor' }
      ]);

      const result = await service.getBudgetReport(mockContext, { project_id: 'proj-1' });
      expect(result.budget_total).toBe(1000);
      expect(result.actual_total).toBe(1000);
      expect(result.variance).toBe(0);
      expect(result.utilization_percentage).toBe(100);

      const cat1 = result.categories.find(c => c.category_id === 'cat-1');
      expect(cat1?.budget_amount).toBe(0);
      expect(cat1?.actual_amount).toBe(500);
      expect(cat1?.utilization_percentage).toBeNull(); // Division by zero protection
      
      const cat2 = result.categories.find(c => c.category_id === 'cat-2');
      expect(cat2?.utilization_percentage).toBe(50);
    });
  });

  describe('Workforce Report', () => {
    it('should aggregate daily attendance correctly', async () => {
      prisma.projectWorkforceAssignment.count.mockResolvedValue(5);
      prisma.dailyAttendance.groupBy.mockResolvedValueOnce([
        { status: 'PRESENT', _count: 10 },
        { status: 'ABSENT', _count: 2 },
        { status: 'HALF_DAY', _count: 1 }
      ]); // For status breakdown
      prisma.dailyAttendance.groupBy.mockResolvedValueOnce([
        { date: new Date('2026-01-01') },
        { date: new Date('2026-01-02') }
      ]); // For unique dates
      prisma.dailyAttendance.groupBy.mockResolvedValueOnce([]); // For member grouping

      const result = await service.getWorkforceReport(mockContext, { project_id: 'proj-1' });
      expect(result.assigned_workforce_count).toBe(5);
      expect(result.present_count).toBe(10);
      expect(result.absent_count).toBe(2);
      expect(result.leave_count).toBe(2);
      expect(result.half_day_count).toBe(1);
      expect(result.attendance_days).toBe(2);
      expect(result.total_attendance_records).toBe(13);
    });
  });

  describe('Equipment Report', () => {
    it('should use count instead of findMany for assignments', async () => {
      prisma.projectEquipmentAssignment.count
        .mockResolvedValueOnce(10) // total_assigned
        .mockResolvedValueOnce(5); // active

      prisma.equipment.groupBy.mockResolvedValue([
        { status: 'AVAILABLE', _count: 3 },
        { status: 'MAINTENANCE', _count: 1 },
        { status: 'INACTIVE', _count: 1 }
      ]);

      const result = await service.getEquipmentReport(mockContext, { project_id: 'proj-1' });
      expect(result.total_assigned).toBe(10);
      expect(result.currently_active).toBe(5);
      expect(result.available).toBe(3);
      expect(result.maintenance).toBe(1);
      expect(result.inactive).toBe(1);
      
      expect(prisma.projectEquipmentAssignment.count).toHaveBeenCalledTimes(2);
      expect(prisma.projectEquipmentAssignment.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organization_id: 'org-1',
            project_id: 'proj-1'
          })
        })
      );
    });
  });
});
