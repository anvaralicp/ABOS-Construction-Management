import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';

export interface AuditEventPayload {
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Explicitly record an audit event for a given tenant context.
   * This does NOT auto-audit every request. It must be called explicitly by business logic.
   */
  async logEvent(context: TenantContext, payload: AuditEventPayload, tx?: any): Promise<void> {
    try {
      const client = tx || this.prisma;
      await client.auditEvent.create({
        data: {
          action: payload.action,
          entity_type: payload.entityType,
          entity_id: payload.entityId,
          actor_id: context.userId,
          organization_id: context.organizationId,
          metadata: payload.metadata || {},
        },
      });
    } catch (error) {
      // We log audit failures but generally do not crash the business transaction
      // unless strictly required (which would be handled differently)
      this.logger.error(`Failed to log audit event: ${error.message}`, error.stack);
    }
  }
}