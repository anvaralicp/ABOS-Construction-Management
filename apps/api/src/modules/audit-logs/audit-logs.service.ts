import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { AuditLogQueryDto } from './dto/audit-logs.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(context: TenantContext, query: AuditLogQueryDto) {
    const {
      page = 1,
      limit = 50,
      from,
      to,
      actorId,
      action,
      entityType,
      entityId,
    } = query;

    const where: any = {
      organization_id: context.organizationId,
    };

    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = new Date(from);
      if (to) where.created_at.lte = new Date(to);
    }

    if (actorId) where.actor_id = actorId;
    if (action) where.action = action;
    if (entityType) where.entity_type = entityType;
    if (entityId) where.entity_id = entityId;

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        take: limit,
        skip,
        orderBy: [
          { created_at: 'desc' },
          { id: 'desc' }, // Deterministic secondary ordering
        ],
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              status: true,
            }
          }
        }
      }),
      this.prisma.auditEvent.count({ where })
    ]);

    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getDetail(context: TenantContext, id: string) {
    const event = await this.prisma.auditEvent.findFirst({
      where: {
        id,
        organization_id: context.organizationId,
      },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            status: true,
          }
        }
      }
    });

    if (!event) {
      throw new NotFoundException('Audit event not found');
    }

    return event;
  }
}
