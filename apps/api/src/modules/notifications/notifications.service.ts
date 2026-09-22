import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { AuditService } from '../../../infrastructure/audit/audit.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { CreateNotificationDto, NotificationQueryDto } from './dto/notification.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  // ---------------------------------------------------------
  // INTERNAL SERVICE BOUNDARY (Used by other modules)
  // ---------------------------------------------------------

  /**
   * Safe internal creation method. Not exposed publicly without admin permissions.
   * Resolves idempotency implicitly via upsert if deduplication_key is provided.
   */
  
  private async validateReferences(context: TenantContext, dto: CreateNotificationDto) {
    // Validate User
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organization_id: context.organizationId,
        user_id: dto.user_id
      }
    });
    if (!membership) {
      throw new BadRequestException('Recipient user does not belong to the organization or is not active.');
    }

    // Validate Project if provided
    if (dto.project_id) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: dto.project_id,
          organization_id: context.organizationId,
          deleted_at: null
        }
      });
      if (!project) {
        throw new BadRequestException('Project does not exist in this organization.');
      }
    }
  }

async create(context: TenantContext, dto: CreateNotificationDto) {
    await this.validateReferences(context, dto);

    const data = {
      organization_id: context.organizationId,
      user_id: dto.user_id,
      project_id: dto.project_id || null,
      type: dto.type,
      severity: dto.severity || 'INFO',
      title: dto.title,
      body: dto.body,
      metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : null,
      expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
      deduplication_key: dto.deduplication_key || null,
    };

    if (dto.deduplication_key) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          organization_id: context.organizationId,
          deduplication_key: dto.deduplication_key
        }
      });
      if (existing) return existing;
    }

    try {
      return await this.prisma.notification.create({ data });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('deduplication_key')) {
        // Race condition occurred, another process inserted the notification first
        const existing = await this.prisma.notification.findFirst({
          where: {
            organization_id: context.organizationId,
            deduplication_key: dto.deduplication_key
          }
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

async createMany(context: TenantContext, dtos: CreateNotificationDto[]) {
    for (const dto of dtos) {
      await this.validateReferences(context, dto);
    }

    const data = dtos.map(dto => ({
      organization_id: context.organizationId,
      user_id: dto.user_id,
      project_id: dto.project_id || null,
      type: dto.type,
      severity: dto.severity || 'INFO',
      title: dto.title,
      body: dto.body,
      metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : null,
      expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
      deduplication_key: dto.deduplication_key || null,
    }));

    try {
      return await this.prisma.notification.createMany({ data, skipDuplicates: true });
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Partial unique index violation fallback
        return { count: 0 }; 
      }
      throw error;
    }
  }

  // ---------------------------------------------------------
  // PUBLIC USER BOUNDARY
  // ---------------------------------------------------------

  private getActiveWhereClause(context: TenantContext): Prisma.NotificationWhereInput {
    const now = new Date();
    return {
      organization_id: context.organizationId,
      user_id: context.userId,
      deleted_at: null,
      OR: [
        { expires_at: null },
        { expires_at: { gt: now } }
      ]
    };
  }

  async findAll(context: TenantContext, query: NotificationQueryDto) {
    const where = this.getActiveWhereClause(context);

    if (query.is_read !== undefined) where.is_read = query.is_read;
    if (query.type) where.type = query.type;
    if (query.severity) where.severity = query.severity;
    if (query.project_id) where.project_id = query.project_id;
    if (query.date_from || query.date_to) {
      where.created_at = {};
      if (query.date_from) where.created_at.gte = new Date(query.date_from);
      if (query.date_to) where.created_at.lte = new Date(query.date_to);
    }

const page = parseInt(query.page || '1', 10);
    let limit = parseInt(query.limit || '50', 10);
    const MAX_PAGE_SIZE = 100;
    if (limit > MAX_PAGE_SIZE) {
      limit = MAX_PAGE_SIZE;
    }
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        take: limit,
        skip,
        orderBy: { created_at: 'desc' }
      }),
      this.prisma.notification.count({ where })
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getUnreadCount(context: TenantContext) {
    const where = this.getActiveWhereClause(context);
    where.is_read = false;
    const count = await this.prisma.notification.count({ where });
    return { unread_count: count };
  }

  async findOne(context: TenantContext, id: string) {
    const where = this.getActiveWhereClause(context);
    const notification = await this.prisma.notification.findFirst({
      where: { ...where, id }
    });
    if (!notification) {
      throw new NotFoundException('Notification not found or access denied');
    }
    return notification;
  }

  async markRead(context: TenantContext, id: string) {
    const notification = await this.findOne(context, id);
    if (!notification.is_read) {
      await this.prisma.notification.update({
        where: { id },
        data: { is_read: true, read_at: new Date() }
      });
    }
    return { success: true };
  }

  async markUnread(context: TenantContext, id: string) {
    const notification = await this.findOne(context, id);
    if (notification.is_read) {
      await this.prisma.notification.update({
        where: { id },
        data: { is_read: false, read_at: null }
      });
    }
    return { success: true };
  }

  async markAllRead(context: TenantContext) {
    const where = this.getActiveWhereClause(context);
    where.is_read = false;

    const result = await this.prisma.notification.updateMany({
      where,
      data: { is_read: true, read_at: new Date() }
    });

    return { updated_count: result.count };
  }

  async delete(context: TenantContext, id: string) {
    const notification = await this.findOne(context, id);
    await this.prisma.notification.update({
      where: { id },
      data: { deleted_at: new Date() }
    });
    // Log deletion specifically
    await this.audit.log(context, 'notification.delete', 'notification', id, {});
    return { success: true };
  }
}
