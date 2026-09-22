import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentService } from './equipment.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { EquipmentStatus, AssignmentStatus } from '@prisma/client';

describe('EquipmentService', () => {
  let service: EquipmentService;
  let prisma: any;
  let audit: any;
  let mockContext: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (callback) => {
        if (typeof callback === 'function') {
          return callback(prisma);
        }
        return callback;
      }),
      equipment: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
      projectEquipmentAssignment: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    audit = {
      logEvent: jest.fn(),
    };

    mockContext = {
      organizationId: 'org-1',
      userId: 'user-1',
      permissions: ['equipment:read', 'equipment:create', 'equipment:update', 'equipment:delete', 'equipment:assign'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
  });

  describe('Equipment CRUD', () => {
    it('should create equipment successfully', async () => {
      prisma.equipment.findFirst.mockResolvedValue(null);
      prisma.equipment.create.mockResolvedValue({ id: 'eq-1', name: 'Excavator' });

      const dto = { name: 'Excavator', code: 'EX-01' };
      const result = await service.create(mockContext, dto);

      expect(prisma.equipment.create).toHaveBeenCalled();
      expect(result.id).toEqual('eq-1');
      expect(audit.logEvent).toHaveBeenCalled();
    });

    it('should reject equipment creation if code exists (application level check)', async () => {
      prisma.equipment.findFirst.mockResolvedValue({ id: 'eq-2' }); // exists

      const dto = { name: 'Excavator', code: 'EX-01' };
      await expect(service.create(mockContext, dto)).rejects.toThrow(ConflictException);
    });

    it('should handle Prisma P2002 unique constraint error (database level check)', async () => {
      prisma.equipment.findFirst.mockResolvedValue(null);
      prisma.equipment.create.mockRejectedValue(Object.assign(new Error(), { code: 'P2002' }));

      const dto = { name: 'Excavator', code: 'EX-01' };
      await expect(service.create(mockContext, dto)).rejects.toThrow(ConflictException);
    });

    it('should allow same code in different organizations', async () => {
      // The findFirst check includes organizationId, so it returns null for a new org
      prisma.equipment.findFirst.mockResolvedValue(null);
      prisma.equipment.create.mockResolvedValue({ id: 'eq-1', name: 'Excavator', code: 'EX-01' });
      
      const dto = { name: 'Excavator', code: 'EX-01' };
      const result = await service.create(mockContext, dto);
      expect(result.id).toEqual('eq-1');
    });

    it('should reject deleting equipment with active assignments', async () => {
      prisma.equipment.findFirst.mockResolvedValue({ id: 'eq-1', name: 'Excavator' });
      prisma.projectEquipmentAssignment.count.mockResolvedValue(1); // 1 active assignment

      await expect(service.delete(mockContext, 'eq-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('Equipment Assignment Concurrency & Lifecycle', () => {
    it('should assign available equipment to project in a serializable transaction', async () => {
      prisma.equipment.findFirst.mockResolvedValue({ id: 'eq-1', status: EquipmentStatus.AVAILABLE });
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: 'ACTIVE' });
      // Inner check returns no active assignment
      prisma.projectEquipmentAssignment.findFirst.mockResolvedValue(null); 
      prisma.projectEquipmentAssignment.create.mockResolvedValue({ id: 'asgn-1' });

      const dto = { project_id: 'proj-1', assigned_from: '2026-01-01T00:00:00Z' };
      const result = await service.createAssignment(mockContext, 'eq-1', dto);

      expect(prisma.projectEquipmentAssignment.create).toHaveBeenCalled();
      expect(prisma.equipment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: EquipmentStatus.ASSIGNED })
      }));
      expect(result.id).toEqual('asgn-1');
      // Assert transaction level
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    });

    it('should reject assigning inactive equipment', async () => {
      prisma.equipment.findFirst.mockResolvedValue({ id: 'eq-1', status: EquipmentStatus.INACTIVE });

      const dto = { project_id: 'proj-1', assigned_from: '2026-01-01T00:00:00Z' };
      await expect(service.createAssignment(mockContext, 'eq-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject overlapping active assignments inside transaction', async () => {
      prisma.equipment.findFirst.mockResolvedValue({ id: 'eq-1', status: EquipmentStatus.AVAILABLE });
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: 'ACTIVE' });
      // Inner check returns an overlapping assignment
      prisma.projectEquipmentAssignment.findFirst.mockResolvedValue({ id: 'asgn-prev' }); 

      const dto = { project_id: 'proj-2', assigned_from: '2026-01-01T00:00:00Z' };
      await expect(service.createAssignment(mockContext, 'eq-1', dto)).rejects.toThrow(ConflictException);
    });

    it('should make equipment available again when unassigning', async () => {
      prisma.equipment.findFirst.mockResolvedValue({ id: 'eq-1' }); // Initial check
      prisma.projectEquipmentAssignment.findFirst.mockResolvedValue({ id: 'asgn-1', assigned_from: new Date('2026-01-01') });
      prisma.projectEquipmentAssignment.update.mockResolvedValue({ id: 'asgn-1', status: AssignmentStatus.COMPLETED });
      prisma.projectEquipmentAssignment.count.mockResolvedValue(0); // No other active assignments
      prisma.equipment.findUnique.mockResolvedValue({ id: 'eq-1', status: EquipmentStatus.ASSIGNED });

      await service.updateAssignment(mockContext, 'eq-1', 'asgn-1', { status: AssignmentStatus.COMPLETED });

      expect(prisma.equipment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: EquipmentStatus.AVAILABLE })
      }));
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    });

    it('should remain assigned when unassigning if another active assignment exists', async () => {
      prisma.equipment.findFirst.mockResolvedValue({ id: 'eq-1' });
      prisma.projectEquipmentAssignment.findFirst.mockResolvedValue({ id: 'asgn-1', assigned_from: new Date('2026-01-01') });
      prisma.projectEquipmentAssignment.update.mockResolvedValue({ id: 'asgn-1', status: AssignmentStatus.COMPLETED });
      prisma.projectEquipmentAssignment.count.mockResolvedValue(1); // Another active exists
      prisma.equipment.findUnique.mockResolvedValue({ id: 'eq-1', status: EquipmentStatus.ASSIGNED }); // current status is ASSIGNED

      await service.updateAssignment(mockContext, 'eq-1', 'asgn-1', { status: AssignmentStatus.COMPLETED });

      // Shouldn't update equipment status to available
      expect(prisma.equipment.update).not.toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: EquipmentStatus.AVAILABLE })
      }));
    });

    it('should change equipment to assigned if assignment is reopened', async () => {
      prisma.equipment.findFirst.mockResolvedValue({ id: 'eq-1' });
      prisma.projectEquipmentAssignment.findFirst.mockResolvedValue({ id: 'asgn-1', status: AssignmentStatus.COMPLETED, assigned_from: new Date('2026-01-01') });
      // Inner check for overlap
      prisma.projectEquipmentAssignment.findFirst.mockResolvedValueOnce({ id: 'asgn-1', status: AssignmentStatus.COMPLETED, assigned_from: new Date('2026-01-01') }).mockResolvedValueOnce(null);
      
      prisma.projectEquipmentAssignment.update.mockResolvedValue({ id: 'asgn-1', status: AssignmentStatus.ACTIVE });
      prisma.equipment.findUnique.mockResolvedValue({ id: 'eq-1', status: EquipmentStatus.AVAILABLE }); // current status

      await service.updateAssignment(mockContext, 'eq-1', 'asgn-1', { status: AssignmentStatus.ACTIVE });

      expect(prisma.equipment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: EquipmentStatus.ASSIGNED })
      }));
    });
  });
});
