import { Test, TestingModule } from '@nestjs/testing';
import { ProgressReportsService } from './progress-reports.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('ProgressReportsService', () => {
  let service: ProgressReportsService;
  let prisma: any;
  let audit: any;
  let mockContext: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (callback) => {
        if (typeof callback === 'function') {
          return callback(prisma);
        }
        return callback; // If array of promises
      }),
      project: {
        findUnique: jest.fn(),
      },
      progressReport: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      document: {
        findFirst: jest.fn(),
      },
      progressReportAttachment: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      dailyAttendance: {
        findMany: jest.fn(),
      },
      expense: {
        aggregate: jest.fn(),
      },
      projectEquipmentAssignment: {
        findMany: jest.fn(),
      }
    };

    audit = {
      logEvent: jest.fn(),
    };

    mockContext = {
      organizationId: 'org-1',
      userId: 'user-1',
      permissions: ['progress_reports:read', 'progress_reports:create', 'progress_reports:update', 'progress_reports:delete'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<ProgressReportsService>(ProgressReportsService);
  });

  describe('Create Report', () => {
    it('should create a report successfully in transaction', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: 'ACTIVE' });
      prisma.progressReport.create.mockResolvedValue({ id: 'rep-1', report_date: new Date() });

      const dto = { project_id: 'proj-1', report_date: '2026-01-01' };
      const result = await service.create(mockContext, dto);

      expect(prisma.progressReport.create).toHaveBeenCalled();
      expect(result.id).toEqual('rep-1');
      expect(audit.logEvent).toHaveBeenCalled(); // Audit uses tx now
    });

    it('should handle duplicate report date error (P2002 Case C)', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: 'ACTIVE' });
      prisma.progressReport.create.mockRejectedValue(Object.assign(new Error(), { code: 'P2002', meta: { target: ['organization_id', 'project_id', 'report_date'] } }));

      const dto = { project_id: 'proj-1', report_date: '2026-01-01' };
      await expect(service.create(mockContext, dto)).rejects.toThrow('A progress report for this project on this date already exists');
    });

    it('should handle duplicate client UUID idempotent success (P2002 Case A)', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: 'ACTIVE' });
      prisma.progressReport.create.mockRejectedValue(Object.assign(new Error(), { code: 'P2002', meta: { target: ['id'] } }));
      
      const existingDate = new Date('2026-01-01T00:00:00.000Z');
      prisma.progressReport.findUnique.mockResolvedValue({ id: 'rep-1', project_id: 'proj-1', report_date: existingDate });

      const dto = { id: 'rep-1', project_id: 'proj-1', report_date: '2026-01-01T00:00:00.000Z' };
      const result = await service.create(mockContext, dto);
      expect(result.id).toEqual('rep-1'); // Idempotent success
    });

    it('should handle duplicate client UUID conflicting payload (P2002 Case B)', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: 'ACTIVE' });
      prisma.progressReport.create.mockRejectedValue(Object.assign(new Error(), { code: 'P2002', meta: { target: ['id'] } }));
      
      const existingDate = new Date('2026-01-02T00:00:00.000Z');
      prisma.progressReport.findUnique.mockResolvedValue({ id: 'rep-1', project_id: 'proj-1', report_date: existingDate });

      const dto = { id: 'rep-1', project_id: 'proj-1', report_date: '2026-01-01T00:00:00.000Z' };
      await expect(service.create(mockContext, dto)).rejects.toThrow('already exists with different data');
    });

    it('should reject creation for archived project', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: 'ARCHIVED' });

      const dto = { project_id: 'proj-1', report_date: '2026-01-01' };
      await expect(service.create(mockContext, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Update Report (Optimistic Concurrency)', () => {
    it('should update successfully with correct version in tx', async () => {
      prisma.progressReport.findFirst.mockResolvedValue({ id: 'rep-1', version: 1 });
      prisma.progressReport.updateMany.mockResolvedValue({ count: 1 });

      await service.update(mockContext, 'rep-1', { version: 1, summary: 'Updated' });

      expect(prisma.progressReport.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ version: 1 })
      }));
      expect(audit.logEvent).toHaveBeenCalled();
    });

    it('should throw conflict if version is stale', async () => {
      prisma.progressReport.findFirst.mockResolvedValue({ id: 'rep-1', version: 2 });
      prisma.progressReport.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.update(mockContext, 'rep-1', { version: 1, summary: 'Stale' })).rejects.toThrow(ConflictException);
    });
  });

  describe('Daily Context', () => {
    it('should fetch report context without N+1 queries and using aggregate for expenses', async () => {
      prisma.progressReport.findFirst.mockResolvedValue({ 
        id: 'rep-1', 
        project_id: 'proj-1', 
        report_date: new Date('2026-01-01T12:00:00Z') 
      });
      
      prisma.dailyAttendance.findMany.mockResolvedValue([{ id: 'att-1' }]);
      prisma.expense.aggregate.mockResolvedValue({ _count: 2, _sum: { total_amount: 150 } });
      prisma.projectEquipmentAssignment.findMany.mockResolvedValue([{ id: 'asgn-1' }]);

      const result = await service.getDailyContext(mockContext, 'rep-1');

      expect(prisma.dailyAttendance.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.expense.aggregate).toHaveBeenCalledTimes(1);
      expect(prisma.projectEquipmentAssignment.findMany).toHaveBeenCalledTimes(1);
      expect(result.expenses.total_amount).toEqual(150);
      expect(result.expenses.count).toEqual(2);
      expect(result.attendance.length).toEqual(1);
      expect(result.equipment.length).toEqual(1);
    });
  });

  describe('Attachments', () => {
    it('should attach a document to the report in tx', async () => {
      prisma.progressReport.findFirst.mockResolvedValue({ id: 'rep-1' });
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1' });
      prisma.progressReportAttachment.create.mockResolvedValue({ id: 'att-1' });

      const result = await service.attachDocument(mockContext, 'rep-1', { document_id: 'doc-1' });

      expect(result.id).toEqual('att-1');
      expect(audit.logEvent).toHaveBeenCalled();
    });

    it('should reject duplicate attachment', async () => {
      prisma.progressReport.findFirst.mockResolvedValue({ id: 'rep-1' });
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1' });
      prisma.progressReportAttachment.create.mockRejectedValue(Object.assign(new Error(), { code: 'P2002' }));

      await expect(service.attachDocument(mockContext, 'rep-1', { document_id: 'doc-1' })).rejects.toThrow(ConflictException);
    });
  });
});
