import { Test, TestingModule } from '@nestjs/testing';
import { WorkforceService } from './workforce.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { WorkforceStatus, AssignmentStatus, AttendanceStatus } from '@prisma/client';

describe('WorkforceService', () => {
  let service: WorkforceService;
  let prisma: any;
  let audit: any;
  let mockContext: any;

  beforeEach(async () => {
    prisma = {
      workforceMember: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      projectWorkforceAssignment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      dailyAttendance: {
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
      project: {
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
      permissions: ['workforce:read', 'workforce:write', 'workforce:delete', 'workforce_assignments:write', 'attendance:write'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkforceService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<WorkforceService>(WorkforceService);
  });

  describe('Workforce Member CRUD', () => {
    it('should create workforce member', async () => {
      prisma.workforceMember.create.mockResolvedValue({ id: 'wk-1', name: 'John Doe' });

      const result = await service.create(mockContext, { name: 'John Doe', trade: 'Mason', status: WorkforceStatus.ACTIVE });
      
      expect(prisma.workforceMember.create).toHaveBeenCalled();
      expect(result.id).toEqual('wk-1');
      expect(audit.logEvent).toHaveBeenCalled();
    });

    it('should successfully update and increment version', async () => {
      prisma.workforceMember.findUnique.mockResolvedValue({ id: 'wk-1', version: 1, status: 'ACTIVE' });
      prisma.workforceMember.updateMany.mockResolvedValue({ count: 1 });

      await service.update(mockContext, 'wk-1', { name: 'John Doe', version: 1 });
      
      expect(prisma.workforceMember.updateMany).toHaveBeenCalledWith({
        where: { id: 'wk-1', organization_id: 'org-1', version: 1, deleted_at: null },
        data: expect.objectContaining({ version: { increment: 1 } })
      });
      expect(audit.logEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'WORKFORCE_UPDATED' }));
    });

    it('should reject update if version is stale', async () => {
      prisma.workforceMember.findUnique.mockResolvedValue({ id: 'wk-1', version: 2 });
      await expect(service.update(mockContext, 'wk-1', { version: 1 })).rejects.toThrow(ConflictException);
    });

    it('should reject update if updateMany returns count 0 (concurrent race)', async () => {
      prisma.workforceMember.findUnique.mockResolvedValue({ id: 'wk-1', version: 1 });
      prisma.workforceMember.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.update(mockContext, 'wk-1', { version: 1 })).rejects.toThrow(ConflictException);
    });

    it('should safely delete if not already deleted', async () => {
      prisma.workforceMember.findUnique.mockResolvedValue({ id: 'wk-1', name: 'John Doe' });
      prisma.workforceMember.updateMany.mockResolvedValue({ count: 1 });

      await service.delete(mockContext, 'wk-1');

      expect(prisma.workforceMember.updateMany).toHaveBeenCalledWith({
        where: { id: 'wk-1', organization_id: 'org-1', deleted_at: null },
        data: expect.objectContaining({ deleted_at: expect.any(Date) })
      });
      expect(audit.logEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'WORKFORCE_DELETED' }));
    });

    it('should reject delete if updateMany returns count 0', async () => {
      prisma.workforceMember.findUnique.mockResolvedValue({ id: 'wk-1', name: 'John Doe' });
      prisma.workforceMember.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.delete(mockContext, 'wk-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('Project Assignment', () => {
    it('should assign worker to project', async () => {
      prisma.workforceMember.findUnique.mockResolvedValue({ id: 'wk-1', status: 'ACTIVE' });
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: 'ACTIVE' });
      prisma.projectWorkforceAssignment.findFirst.mockResolvedValue(null); // No active assignment
      prisma.projectWorkforceAssignment.create.mockResolvedValue({ id: 'asgn-1' });

      const dto = { project_id: 'proj-1', role: 'Foreman', start_date: '2026-01-01T00:00:00Z' };
      const result = await service.createAssignment(mockContext, 'wk-1', dto);

      expect(prisma.projectWorkforceAssignment.create).toHaveBeenCalled();
      expect(result.id).toEqual('asgn-1');
    });

    it('should prevent assigning inactive worker', async () => {
      prisma.workforceMember.findUnique.mockResolvedValue({ id: 'wk-1', status: 'INACTIVE' });
      
      await expect(service.createAssignment(mockContext, 'wk-1', { project_id: 'proj-1' })).rejects.toThrow(BadRequestException);
    });

    it('should prevent duplicate active assignments to same project', async () => {
      prisma.workforceMember.findUnique.mockResolvedValue({ id: 'wk-1', status: 'ACTIVE' });
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: 'ACTIVE' });
      prisma.projectWorkforceAssignment.findFirst.mockResolvedValue({ id: 'asgn-old' });

      await expect(service.createAssignment(mockContext, 'wk-1', { project_id: 'proj-1' })).rejects.toThrow(ConflictException);
    });
  });

  describe('Daily Attendance (Offline & Concurrency)', () => {
    it('should create attendance if worker is assigned', async () => {
      prisma.workforceMember.findUnique.mockResolvedValue({ id: 'wk-1' });
      prisma.projectWorkforceAssignment.findFirst.mockResolvedValue({ id: 'asgn-1' }); // Is assigned
      prisma.dailyAttendance.findFirst.mockResolvedValueOnce(null); // Not an offline retry
      prisma.dailyAttendance.findFirst.mockResolvedValueOnce(null); // Not a duplicate day record
      prisma.dailyAttendance.create.mockResolvedValue({ id: 'uuid-client-1' });

      const dto = { id: 'uuid-client-1', project_id: 'proj-1', date: '2026-01-01T08:00:00Z', hours: 8, status: AttendanceStatus.PRESENT };
      const result = await service.createAttendance(mockContext, 'wk-1', dto);

      expect(prisma.dailyAttendance.create).toHaveBeenCalled();
      expect(result.id).toEqual('uuid-client-1');
    });

    it('should return existing record for offline retry (idempotency)', async () => {
      prisma.workforceMember.findUnique.mockResolvedValue({ id: 'wk-1' });
      prisma.projectWorkforceAssignment.findFirst.mockResolvedValue({ id: 'asgn-1' });
      prisma.dailyAttendance.findFirst.mockResolvedValueOnce({ id: 'uuid-client-1' }); // Is an offline retry

      const dto = { id: 'uuid-client-1', project_id: 'proj-1', date: '2026-01-01T08:00:00Z', hours: 8 };
      const result = await service.createAttendance(mockContext, 'wk-1', dto);

      expect(prisma.dailyAttendance.create).not.toHaveBeenCalled();
      expect(result.id).toEqual('uuid-client-1');
    });

    it('should reject attendance update if version is stale', async () => {
      prisma.workforceMember.findUnique.mockResolvedValue({ id: 'wk-1' });
      prisma.dailyAttendance.findFirst.mockResolvedValue({ id: 'att-1', version: 2 });

      await expect(service.updateAttendance(mockContext, 'wk-1', 'att-1', { version: 1 })).rejects.toThrow(ConflictException);
    });

    it('should reject unassigned worker', async () => {
      prisma.workforceMember.findUnique.mockResolvedValue({ id: 'wk-1' });
      prisma.projectWorkforceAssignment.findFirst.mockResolvedValue(null);

      const dto = { id: 'uuid-client-1', project_id: 'proj-1', date: '2026-01-01T08:00:00Z', hours: 8 };
      await expect(service.createAttendance(mockContext, 'wk-1', dto)).rejects.toThrow(BadRequestException);
    });
  });
});
