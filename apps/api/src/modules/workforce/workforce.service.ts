import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { CreateWorkforceDto, UpdateWorkforceDto, CreateAssignmentDto, UpdateAssignmentDto, CreateAttendanceDto, UpdateAttendanceDto, WorkforceQueryDto } from './dto/workforce.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WorkforceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // --- Workforce Member ---

  async create(context: TenantContext, dto: CreateWorkforceDto) {
    const member = await this.prisma.workforceMember.create({
      data: {
        organization_id: context.organizationId,
        name: dto.name,
        trade: dto.trade,
        hourly_rate: dto.hourly_rate,
        currency: dto.currency,
        status: dto.status,
        created_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'WORKFORCE_CREATED',
      entityType: 'WorkforceMember',
      entityId: member.id,
      metadata: { name: member.name }
    });

    return member;
  }

  async findAll(context: TenantContext, query: WorkforceQueryDto) {
    const { status, search, page = '1', limit = '50' } = query;

    const where: Prisma.WorkforceMemberWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null,
    };

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { trade: { contains: search, mode: 'insensitive' } },
      ];
    }

    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.workforceMember.findMany({ where, take, skip, orderBy: { name: 'asc' } }),
      this.prisma.workforceMember.count({ where })
    ]);

    return {
      data: items,
      meta: { total, page: parseInt(page, 10), limit: take, pages: Math.ceil(total / take) }
    };
  }

  async findOne(context: TenantContext, id: string) {
    const member = await this.prisma.workforceMember.findUnique({
      where: { id_organization_id: { id, organization_id: context.organizationId } },
    });

    if (!member || member.deleted_at) {
      throw new NotFoundException('Workforce member not found.');
    }

    return member;
  }

  async update(context: TenantContext, id: string, dto: UpdateWorkforceDto) {
    const existing = await this.findOne(context, id);

    if (existing.version !== dto.version) {
      throw new ConflictException(`Version mismatch. Expected ${existing.version}, but got ${dto.version}.`);
    }

    const result = await this.prisma.workforceMember.updateMany({
      where: { 
        id, 
        organization_id: context.organizationId,
        version: dto.version,
        deleted_at: null
      },
      data: {
        name: dto.name !== undefined ? dto.name : existing.name,
        trade: dto.trade !== undefined ? dto.trade : existing.trade,
        hourly_rate: dto.hourly_rate !== undefined ? dto.hourly_rate : existing.hourly_rate,
        currency: dto.currency !== undefined ? dto.currency : existing.currency,
        status: dto.status !== undefined ? dto.status : existing.status,
        version: { increment: 1 },
        updated_by: context.userId,
      }
    });

    if (result.count === 0) {
      throw new ConflictException('The record was modified or deleted by another user. Please refresh and try again.');
    }

    const updated = await this.findOne(context, id);

    const action = dto.status !== undefined && dto.status !== existing.status 
      ? (dto.status === 'ACTIVE' ? 'WORKFORCE_ACTIVATED' : 'WORKFORCE_DEACTIVATED') 
      : 'WORKFORCE_UPDATED';

    await this.audit.logEvent(context, {
      action,
      entityType: 'WorkforceMember',
      entityId: id,
      metadata: { status: updated.status }
    });

    return updated;
  }

  async delete(context: TenantContext, id: string) {
    const member = await this.findOne(context, id);

    const result = await this.prisma.workforceMember.updateMany({
      where: { 
        id, 
        organization_id: context.organizationId,
        deleted_at: null
      },
      data: { deleted_at: new Date(), updated_by: context.userId }
    });

    if (result.count === 0) {
      throw new ConflictException('The record was modified or deleted by another user. Please refresh and try again.');
    }

    await this.audit.logEvent(context, {
      action: 'WORKFORCE_DELETED',
      entityType: 'WorkforceMember',
      entityId: id,
      metadata: { name: member.name }
    });

    return { success: true };
  }

  // --- Assignments ---

  async createAssignment(context: TenantContext, workforceId: string, dto: CreateAssignmentDto) {
    const worker = await this.findOne(context, workforceId);

    if (worker.status !== 'ACTIVE') {
      throw new BadRequestException('Cannot assign an inactive workforce member.');
    }

    const project = await this.prisma.project.findUnique({
      where: { id_organization_id: { id: dto.project_id, organization_id: context.organizationId } }
    });

    if (!project || project.deleted_at || project.status === 'ARCHIVED') {
      throw new BadRequestException('Project is invalid or archived.');
    }

    if (dto.start_date && dto.end_date && new Date(dto.end_date) < new Date(dto.start_date)) {
      throw new BadRequestException('End date cannot be before start date.');
    }

    // Check for duplicate active assignment
    const existing = await this.prisma.projectWorkforceAssignment.findFirst({
      where: {
        organization_id: context.organizationId,
        project_id: dto.project_id,
        workforce_member_id: workforceId,
        status: 'ACTIVE'
      }
    });

    if (existing) {
      throw new ConflictException('Worker is already actively assigned to this project.');
    }

    const assignment = await this.prisma.projectWorkforceAssignment.create({
      data: {
        organization_id: context.organizationId,
        project_id: dto.project_id,
        workforce_member_id: workforceId,
        role: dto.role,
        rate: dto.rate,
        currency: dto.currency,
        start_date: dto.start_date ? new Date(dto.start_date) : null,
        end_date: dto.end_date ? new Date(dto.end_date) : null,
        status: dto.status,
        created_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'WORKFORCE_ASSIGNED',
      entityType: 'ProjectWorkforceAssignment',
      entityId: assignment.id,
      metadata: { project_id: dto.project_id, workforce_id: workforceId }
    });

    return assignment;
  }

  async getAssignments(context: TenantContext, workforceId: string) {
    await this.findOne(context, workforceId);

    return this.prisma.projectWorkforceAssignment.findMany({
      where: { organization_id: context.organizationId, workforce_member_id: workforceId },
      include: { project: { select: { name: true, code: true } } },
      orderBy: { created_at: 'desc' }
    });
  }

  async updateAssignment(context: TenantContext, workforceId: string, assignmentId: string, dto: UpdateAssignmentDto) {
    await this.findOne(context, workforceId);

    const assignment = await this.prisma.projectWorkforceAssignment.findFirst({
      where: { id: assignmentId, workforce_member_id: workforceId, organization_id: context.organizationId }
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    const start_date = dto.start_date ? new Date(dto.start_date) : assignment.start_date;
    const end_date = dto.end_date ? new Date(dto.end_date) : assignment.end_date;

    if (start_date && end_date && end_date < start_date) {
      throw new BadRequestException('End date cannot be before start date.');
    }

    const updated = await this.prisma.projectWorkforceAssignment.update({
      where: { id: assignmentId },
      data: {
        role: dto.role !== undefined ? dto.role : assignment.role,
        rate: dto.rate !== undefined ? dto.rate : assignment.rate,
        currency: dto.currency !== undefined ? dto.currency : assignment.currency,
        start_date,
        end_date,
        status: dto.status !== undefined ? dto.status : assignment.status,
        updated_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'WORKFORCE_ASSIGNMENT_UPDATED',
      entityType: 'ProjectWorkforceAssignment',
      entityId: assignmentId,
      metadata: { status: updated.status }
    });

    return updated;
  }

  async getProjectWorkforce(context: TenantContext, projectId: string) {
    return this.prisma.projectWorkforceAssignment.findMany({
      where: { organization_id: context.organizationId, project_id: projectId },
      include: { workforce_member: { select: { name: true, trade: true, hourly_rate: true } } },
      orderBy: { created_at: 'desc' }
    });
  }

  // --- Daily Attendance ---

  async createAttendance(context: TenantContext, workforceId: string, dto: CreateAttendanceDto) {
    await this.findOne(context, workforceId); // tenant/existence validation

    // Check project assignment
    const assignment = await this.prisma.projectWorkforceAssignment.findFirst({
      where: {
        organization_id: context.organizationId,
        project_id: dto.project_id,
        workforce_member_id: workforceId,
        status: 'ACTIVE'
      }
    });

    if (!assignment) {
      throw new BadRequestException('Worker is not actively assigned to this project.');
    }

    // Check offline creation idempotency (client-generated UUID)
    const existingOffline = await this.prisma.dailyAttendance.findFirst({
      where: { id: dto.id, organization_id: context.organizationId }
    });

    if (existingOffline) {
      return existingOffline; // Return existing for offline retry
    }

    // Check canonical uniqueness: 1 record per worker per project per day
    const dateObj = new Date(dto.date);
    const startOfDay = new Date(dateObj.setUTCHours(0,0,0,0));
    
    const duplicateDay = await this.prisma.dailyAttendance.findFirst({
      where: {
        organization_id: context.organizationId,
        project_id: dto.project_id,
        workforce_member_id: workforceId,
        date: {
          gte: startOfDay,
          lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    if (duplicateDay) {
      throw new ConflictException('Attendance already recorded for this worker on this project and date.');
    }

    const attendance = await this.prisma.dailyAttendance.create({
      data: {
        id: dto.id,
        organization_id: context.organizationId,
        project_id: dto.project_id,
        workforce_member_id: workforceId,
        date: new Date(dto.date),
        hours: dto.hours,
        status: dto.status,
        remarks: dto.remarks,
        client_created_at: dto.client_created_at ? new Date(dto.client_created_at) : null,
        created_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'ATTENDANCE_CREATED',
      entityType: 'DailyAttendance',
      entityId: attendance.id,
      metadata: { project_id: dto.project_id, date: dto.date }
    });

    return attendance;
  }

  async updateAttendance(context: TenantContext, workforceId: string, attendanceId: string, dto: UpdateAttendanceDto) {
    await this.findOne(context, workforceId);

    const existing = await this.prisma.dailyAttendance.findFirst({
      where: { id: attendanceId, workforce_member_id: workforceId, organization_id: context.organizationId }
    });

    if (!existing) {
      throw new NotFoundException('Attendance record not found.');
    }

    if (existing.version !== dto.version) {
      throw new ConflictException(`Version mismatch. Expected ${existing.version}, but got ${dto.version}.`);
    }

    const result = await this.prisma.dailyAttendance.updateMany({
      where: { id: attendanceId, organization_id: context.organizationId, version: dto.version },
      data: {
        hours: dto.hours !== undefined ? dto.hours : existing.hours,
        status: dto.status !== undefined ? dto.status : existing.status,
        remarks: dto.remarks !== undefined ? dto.remarks : existing.remarks,
        client_updated_at: dto.client_updated_at ? new Date(dto.client_updated_at) : existing.client_updated_at,
        version: { increment: 1 },
        updated_by: context.userId,
      }
    });

    if (result.count === 0) {
      throw new ConflictException('The attendance record was updated by another user or sync process.');
    }

    const updated = await this.prisma.dailyAttendance.findUnique({
      where: { id: attendanceId }
    });

    if (!updated) {
      throw new NotFoundException('Attendance record not found after update.');
    }

    await this.audit.logEvent(context, {
      action: 'ATTENDANCE_UPDATED',
      entityType: 'DailyAttendance',
      entityId: attendanceId,
      metadata: { version: updated.version }
    });

    return updated;
  }
}
