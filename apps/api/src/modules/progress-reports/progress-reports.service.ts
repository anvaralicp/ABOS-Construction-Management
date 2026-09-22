import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { CreateProgressReportDto, UpdateProgressReportDto, ProgressReportQueryDto, AttachDocumentDto } from './dto/progress-report.dto';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProgressReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(context: TenantContext, dto: CreateProgressReportDto) {
    const project = await this.prisma.project.findUnique({
      where: { id_organization_id: { id: dto.project_id, organization_id: context.organizationId } }
    });

    if (!project || project.deleted_at || project.status === 'ARCHIVED') {
      throw new BadRequestException('Project is invalid or archived.');
    }

    return this.prisma.$transaction(async (tx) => {
      try {
        const report = await tx.progressReport.create({
          data: {
            id: dto.id || uuidv4(),
            organization_id: context.organizationId,
            project_id: dto.project_id,
            report_date: new Date(dto.report_date),
            summary: dto.summary,
            work_completed: dto.work_completed,
            issues: dto.issues,
            delays: dto.delays,
            next_day_plan: dto.next_day_plan,
            status: dto.status || 'DRAFT',
            prepared_by: context.userId,
            client_created_at: dto.client_created_at ? new Date(dto.client_created_at) : null,
            client_updated_at: dto.client_updated_at ? new Date(dto.client_updated_at) : null,
          }
        });

        await this.audit.logEvent(context, {
          action: 'PROGRESS_REPORT_CREATED',
          entityType: 'ProgressReport',
          entityId: report.id,
          metadata: { project_id: dto.project_id, report_date: dto.report_date }
        }, tx);

        return report;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const target = error.meta?.target as string | string[];
          if (target && target.includes('id')) {
            // Case A: Same client UUID retry
            const existing = await tx.progressReport.findUnique({ where: { id_organization_id: { id: dto.id, organization_id: context.organizationId } } });
            if (existing) {
              if (existing.project_id === dto.project_id && existing.report_date.toISOString() === new Date(dto.report_date).toISOString()) {
                return existing; // Idempotent success
              }
              // Case B: Conflicting payload
              throw new ConflictException('A progress report with this ID already exists with different data.');
            }
            // Cross-tenant collision or just missing in this org
            throw new ConflictException('A progress report with this ID already exists in another context.');
          }
          // Case C: The organization_id + project_id + report_date constraint failed.
          throw new ConflictException('A progress report for this project on this date already exists.');
        }
        throw error;
      }
    });
  }

  async findAll(context: TenantContext, query: ProgressReportQueryDto) {
    const { project_id, report_date, start_date, end_date, status, page = '1', limit = '50' } = query;

    const where: Prisma.ProgressReportWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null,
    };

    if (project_id) where.project_id = project_id;
    if (report_date) where.report_date = new Date(report_date);
    if (status) where.status = status;

    if (start_date || end_date) {
      where.report_date = {};
      if (start_date) where.report_date.gte = new Date(start_date);
      if (end_date) where.report_date.lte = new Date(end_date);
    }

    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.progressReport.findMany({
        where,
        take,
        skip,
        orderBy: { report_date: 'desc' },
        include: {
          project: { select: { name: true, code: true } }
        }
      }),
      this.prisma.progressReport.count({ where })
    ]);

    return {
      data: items,
      meta: { total, page: parseInt(page, 10), limit: take, pages: Math.ceil(total / take) }
    };
  }

  async findOne(context: TenantContext, id: string) {
    const report = await this.prisma.progressReport.findFirst({
      where: { id, organization_id: context.organizationId, deleted_at: null },
      include: {
        project: { select: { name: true, code: true } },
        attachments: { include: { document: true } }
      }
    });

    if (!report) {
      throw new NotFoundException('Progress report not found.');
    }

    return report;
  }

  async update(context: TenantContext, id: string, dto: UpdateProgressReportDto) {
    const existing = await this.findOne(context, id);

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.progressReport.updateMany({
        where: {
          id,
          organization_id: context.organizationId,
          version: dto.version,
          deleted_at: null,
        },
        data: {
          summary: dto.summary !== undefined ? dto.summary : existing.summary,
          work_completed: dto.work_completed !== undefined ? dto.work_completed : existing.work_completed,
          issues: dto.issues !== undefined ? dto.issues : existing.issues,
          delays: dto.delays !== undefined ? dto.delays : existing.delays,
          next_day_plan: dto.next_day_plan !== undefined ? dto.next_day_plan : existing.next_day_plan,
          status: dto.status !== undefined ? dto.status : existing.status,
          version: { increment: 1 },
          client_updated_at: dto.client_updated_at ? new Date(dto.client_updated_at) : existing.client_updated_at,
        }
      });

      if (result.count === 0) {
        throw new ConflictException('The report has been updated by another user or version is stale.');
      }

      await this.audit.logEvent(context, {
        action: 'PROGRESS_REPORT_UPDATED',
        entityType: 'ProgressReport',
        entityId: id,
        metadata: { version: dto.version + 1, status: dto.status }
      }, tx);

      return tx.progressReport.findFirst({
        where: { id, organization_id: context.organizationId, deleted_at: null },
        include: {
          project: { select: { name: true, code: true } },
          attachments: { include: { document: true } }
        }
      });
    });
  }

  async delete(context: TenantContext, id: string) {
    const report = await this.findOne(context, id);

    return this.prisma.$transaction(async (tx) => {
      await tx.progressReport.update({
        where: { id },
        data: { deleted_at: new Date() }
      });

      await this.audit.logEvent(context, {
        action: 'PROGRESS_REPORT_DELETED',
        entityType: 'ProgressReport',
        entityId: id,
        metadata: { project_id: report.project_id, report_date: report.report_date }
      }, tx);

      return { success: true };
    });
  }

  // --- Attachments ---

  async attachDocument(context: TenantContext, reportId: string, dto: AttachDocumentDto) {
    const report = await this.findOne(context, reportId);

    const document = await this.prisma.document.findFirst({
      where: { id: dto.document_id, organization_id: context.organizationId, deleted_at: null, status: 'AVAILABLE' }
    });

    if (!document) {
      throw new NotFoundException('Document not found or not available.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const attachment = await tx.progressReportAttachment.create({
          data: {
            organization_id: context.organizationId,
            progress_report_id: reportId,
            document_id: dto.document_id
          }
        });

        await this.audit.logEvent(context, {
          action: 'PROGRESS_REPORT_ATTACHMENT_ADDED',
          entityType: 'ProgressReport',
          entityId: reportId,
          metadata: { document_id: dto.document_id }
        }, tx);

        return attachment;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Document is already attached to this report.');
      }
      throw error;
    }
  }

  async removeAttachment(context: TenantContext, reportId: string, attachmentId: string) {
    await this.findOne(context, reportId);

    const attachment = await this.prisma.progressReportAttachment.findFirst({
      where: { id: attachmentId, progress_report_id: reportId, organization_id: context.organizationId }
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.progressReportAttachment.delete({ where: { id: attachmentId } });

      await this.audit.logEvent(context, {
        action: 'PROGRESS_REPORT_ATTACHMENT_REMOVED',
        entityType: 'ProgressReport',
        entityId: reportId,
        metadata: { document_id: attachment.document_id }
      }, tx);

      return { success: true };
    });
  }

  // --- Daily Context ---

  async getDailyContext(context: TenantContext, id: string) {
    const report = await this.findOne(context, id);
    const reportDate = new Date(report.report_date);

    const startOfDay = new Date(reportDate);
    startOfDay.setUTCHours(0,0,0,0);
    
    const endOfDay = new Date(reportDate);
    endOfDay.setUTCHours(23,59,59,999);

    // 1. Fetch Attendance for the project and report_date
    const attendance = await this.prisma.dailyAttendance.findMany({
      where: {
        organization_id: context.organizationId,
        project_id: report.project_id,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: { workforce_member: { select: { name: true, role: true } } }
    });

    // 2. Fetch Expenses for the project and report_date (Database Aggregated)
    const expenseSummary = await this.prisma.expense.aggregate({
      where: {
        organization_id: context.organizationId,
        project_id: report.project_id,
        expense_date: {
          gte: startOfDay,
          lte: endOfDay
        },
        deleted_at: null
      },
      _count: true,
      _sum: {
        total_amount: true
      }
    });

    // 3. Fetch Equipment assigned to the project ON the report_date
    const equipmentAssignments = await this.prisma.projectEquipmentAssignment.findMany({
      where: {
        organization_id: context.organizationId,
        project_id: report.project_id,
        assigned_from: { lte: endOfDay },
        OR: [
          { assigned_to: null },
          { assigned_to: { gte: startOfDay } }
        ]
      },
      include: { equipment: { select: { name: true, code: true, equipment_type: true } } }
    });

    return {
      report,
      attendance,
      expenses: {
        count: expenseSummary._count || 0,
        total_amount: expenseSummary._sum?.total_amount || 0,
      },
      equipment: equipmentAssignments
    };
  }
}
