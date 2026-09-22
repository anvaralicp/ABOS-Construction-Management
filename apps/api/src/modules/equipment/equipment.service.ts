import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { CreateEquipmentDto, UpdateEquipmentDto, EquipmentQueryDto, AssignEquipmentDto, UpdateAssignmentDto } from './dto/equipment.dto';
import { Prisma, EquipmentStatus, AssignmentStatus } from '@prisma/client';

@Injectable()
export class EquipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // --- Equipment CRUD ---

  async create(context: TenantContext, dto: CreateEquipmentDto) {
    if (dto.code) await this.checkUniqueness(context, 'code', dto.code);
    if (dto.serial_number) await this.checkUniqueness(context, 'serial_number', dto.serial_number);
    if (dto.registration_number) await this.checkUniqueness(context, 'registration_number', dto.registration_number);

    try {
      const equipment = await this.prisma.equipment.create({
        data: {
          organization_id: context.organizationId,
          code: dto.code,
          name: dto.name,
          description: dto.description,
          equipment_type: dto.equipment_type,
          manufacturer: dto.manufacturer,
          model: dto.model,
          serial_number: dto.serial_number,
          registration_number: dto.registration_number,
          status: dto.status,
          notes: dto.notes,
          created_by: context.userId,
        }
      });

      await this.audit.logEvent(context, {
        action: 'EQUIPMENT_CREATED',
        entityType: 'Equipment',
        entityId: equipment.id,
        metadata: { name: equipment.name, code: equipment.code }
      });

      return equipment;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An equipment record with this identifier already exists in the organization.');
      }
      throw error;
    }
  }

  async findAll(context: TenantContext, query: EquipmentQueryDto) {
    const { status, equipment_type, search, page = '1', limit = '50' } = query;

    const where: Prisma.EquipmentWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null,
    };

    if (status) where.status = status;
    if (equipment_type) where.equipment_type = equipment_type;
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { serial_number: { contains: search, mode: 'insensitive' } },
        { registration_number: { contains: search, mode: 'insensitive' } },
      ];
    }

    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.equipment.findMany({ where, take, skip, orderBy: { name: 'asc' } }),
      this.prisma.equipment.count({ where })
    ]);

    return {
      data: items,
      meta: { total, page: parseInt(page, 10), limit: take, pages: Math.ceil(total / take) }
    };
  }

  async findOne(context: TenantContext, id: string) {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id, organization_id: context.organizationId, deleted_at: null },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found.');
    }

    return equipment;
  }

  async update(context: TenantContext, id: string, dto: UpdateEquipmentDto) {
    const existing = await this.findOne(context, id);

    if (dto.code && dto.code !== existing.code) {
      await this.checkUniqueness(context, 'code', dto.code);
    }
    if (dto.serial_number && dto.serial_number !== existing.serial_number) {
      await this.checkUniqueness(context, 'serial_number', dto.serial_number);
    }
    if (dto.registration_number && dto.registration_number !== existing.registration_number) {
      await this.checkUniqueness(context, 'registration_number', dto.registration_number);
    }

    try {
      const updated = await this.prisma.equipment.update({
        where: { id },
        data: {
          code: dto.code !== undefined ? dto.code : existing.code,
          name: dto.name !== undefined ? dto.name : existing.name,
          description: dto.description !== undefined ? dto.description : existing.description,
          equipment_type: dto.equipment_type !== undefined ? dto.equipment_type : existing.equipment_type,
          manufacturer: dto.manufacturer !== undefined ? dto.manufacturer : existing.manufacturer,
          model: dto.model !== undefined ? dto.model : existing.model,
          serial_number: dto.serial_number !== undefined ? dto.serial_number : existing.serial_number,
          registration_number: dto.registration_number !== undefined ? dto.registration_number : existing.registration_number,
          status: dto.status !== undefined ? dto.status : existing.status,
          notes: dto.notes !== undefined ? dto.notes : existing.notes,
          updated_by: context.userId,
        }
      });

      const action = dto.status !== undefined && dto.status !== existing.status 
        ? \`EQUIPMENT_STATUS_\${dto.status}\` 
        : 'EQUIPMENT_UPDATED';

      await this.audit.logEvent(context, {
        action,
        entityType: 'Equipment',
        entityId: id,
        metadata: { status: updated.status }
      });

      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An equipment record with this identifier already exists in the organization.');
      }
      throw error;
    }
  }

  async delete(context: TenantContext, id: string) {
    const equipment = await this.findOne(context, id);

    // Prevent deletion if it has active assignments
    const activeAssignments = await this.prisma.projectEquipmentAssignment.count({
      where: { equipment_id: id, status: AssignmentStatus.ACTIVE }
    });

    if (activeAssignments > 0) {
      throw new BadRequestException('Cannot delete equipment with active assignments.');
    }

    await this.prisma.equipment.update({
      where: { id },
      data: { deleted_at: new Date(), updated_by: context.userId }
    });

    await this.audit.logEvent(context, {
      action: 'EQUIPMENT_DELETED',
      entityType: 'Equipment',
      entityId: id,
      metadata: { name: equipment.name }
    });

    return { success: true };
  }

  private async checkUniqueness(context: TenantContext, field: string, value: string) {
    const existing = await this.prisma.equipment.findFirst({
      where: { organization_id: context.organizationId, [field]: value, deleted_at: null }
    });
    if (existing) {
      throw new ConflictException(\`Equipment with \${field} '\${value}' already exists.\`);
    }
  }

  // --- Assignments ---

  async createAssignment(context: TenantContext, equipmentId: string, dto: AssignEquipmentDto) {
    const equipment = await this.findOne(context, equipmentId);

    if (equipment.status === EquipmentStatus.INACTIVE || equipment.status === EquipmentStatus.MAINTENANCE) {
      throw new BadRequestException(\`Cannot assign equipment that is \${equipment.status}.\`);
    }

    const project = await this.prisma.project.findUnique({
      where: { id_organization_id: { id: dto.project_id, organization_id: context.organizationId } }
    });

    if (!project || project.deleted_at || project.status === 'ARCHIVED') {
      throw new BadRequestException('Project is invalid or archived.');
    }

    if (dto.assigned_to && new Date(dto.assigned_to) < new Date(dto.assigned_from)) {
      throw new BadRequestException('assigned_to date cannot be before assigned_from date.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Check for overlapping active assignments inside the Serializable transaction
      const activeAssignment = await tx.projectEquipmentAssignment.findFirst({
        where: {
          organization_id: context.organizationId,
          equipment_id: equipmentId,
          status: AssignmentStatus.ACTIVE
        }
      });

      if (activeAssignment) {
        throw new ConflictException('Equipment is already actively assigned to a project. Close the existing assignment first.');
      }

      const assignment = await tx.projectEquipmentAssignment.create({
        data: {
          organization_id: context.organizationId,
          project_id: dto.project_id,
          equipment_id: equipmentId,
          assigned_from: new Date(dto.assigned_from),
          assigned_to: dto.assigned_to ? new Date(dto.assigned_to) : null,
          status: AssignmentStatus.ACTIVE,
          notes: dto.notes,
          created_by: context.userId,
        }
      });

      // Automatically update equipment status to ASSIGNED
      if (equipment.status !== EquipmentStatus.ASSIGNED) {
        await tx.equipment.update({
          where: { id: equipmentId },
          data: { status: EquipmentStatus.ASSIGNED, updated_by: context.userId }
        });
      }

      await this.audit.logEvent(context, {
        action: 'EQUIPMENT_ASSIGNED',
        entityType: 'ProjectEquipmentAssignment',
        entityId: assignment.id,
        metadata: { project_id: dto.project_id, equipment_id: equipmentId }
      });

      return assignment;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  }

  async getEquipmentAssignments(context: TenantContext, equipmentId: string) {
    await this.findOne(context, equipmentId);

    return this.prisma.projectEquipmentAssignment.findMany({
      where: { organization_id: context.organizationId, equipment_id: equipmentId },
      include: { project: { select: { name: true, code: true } } },
      orderBy: { created_at: 'desc' }
    });
  }

  async updateAssignment(context: TenantContext, equipmentId: string, assignmentId: string, dto: UpdateAssignmentDto) {
    await this.findOne(context, equipmentId);

    const assignment = await this.prisma.projectEquipmentAssignment.findFirst({
      where: { id: assignmentId, equipment_id: equipmentId, organization_id: context.organizationId }
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    const assigned_from = dto.assigned_from ? new Date(dto.assigned_from) : assignment.assigned_from;
    const assigned_to = dto.assigned_to ? new Date(dto.assigned_to) : assignment.assigned_to;

    if (assigned_to && assigned_to < assigned_from) {
      throw new BadRequestException('assigned_to date cannot be before assigned_from date.');
    }

    return this.prisma.$transaction(async (tx) => {
      // If reopening as ACTIVE, check for overlapping assignments
      if (dto.status === AssignmentStatus.ACTIVE && assignment.status !== AssignmentStatus.ACTIVE) {
        const activeAssignment = await tx.projectEquipmentAssignment.findFirst({
          where: {
            organization_id: context.organizationId,
            equipment_id: equipmentId,
            status: AssignmentStatus.ACTIVE
          }
        });

        if (activeAssignment) {
          throw new ConflictException('Equipment is already actively assigned to a project. Close the existing assignment first.');
        }
      }

      const updated = await tx.projectEquipmentAssignment.update({
        where: { id: assignmentId },
        data: {
          assigned_from,
          assigned_to,
          status: dto.status !== undefined ? dto.status : assignment.status,
          notes: dto.notes !== undefined ? dto.notes : assignment.notes,
          updated_by: context.userId,
        }
      });

      // Synchronize Equipment Status
      const newStatus = updated.status;
      if (newStatus === AssignmentStatus.ACTIVE) {
        // Must become ASSIGNED
        const currentEquipment = await tx.equipment.findUnique({ where: { id: equipmentId } });
        if (currentEquipment.status !== EquipmentStatus.ASSIGNED) {
          await tx.equipment.update({
            where: { id: equipmentId },
            data: { status: EquipmentStatus.ASSIGNED, updated_by: context.userId }
          });
        }
      } else if ([AssignmentStatus.COMPLETED, AssignmentStatus.INACTIVE].includes(newStatus)) {
        // If completed/inactive, check if any other ACTIVE assignments exist
        const otherActive = await tx.projectEquipmentAssignment.count({
          where: { equipment_id: equipmentId, id: { not: assignmentId }, status: AssignmentStatus.ACTIVE }
        });

        if (otherActive === 0) {
          await tx.equipment.update({
            where: { id: equipmentId },
            data: { status: EquipmentStatus.AVAILABLE, updated_by: context.userId }
          });
        } else {
          // If another active assignment exists, ensure equipment is ASSIGNED
          const currentEquipment = await tx.equipment.findUnique({ where: { id: equipmentId } });
          if (currentEquipment.status !== EquipmentStatus.ASSIGNED) {
            await tx.equipment.update({
              where: { id: equipmentId },
              data: { status: EquipmentStatus.ASSIGNED, updated_by: context.userId }
            });
          }
        }
      }

      await this.audit.logEvent(context, {
        action: 'EQUIPMENT_ASSIGNMENT_UPDATED',
        entityType: 'ProjectEquipmentAssignment',
        entityId: assignmentId,
        metadata: { status: updated.status }
      });

      return updated;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  }

  async getProjectEquipment(context: TenantContext, projectId: string) {
    return this.prisma.projectEquipmentAssignment.findMany({
      where: { organization_id: context.organizationId, project_id: projectId },
      include: { 
        equipment: { 
          select: { name: true, code: true, equipment_type: true, status: true, serial_number: true } 
        } 
      },
      orderBy: { created_at: 'desc' }
    });
  }
}
