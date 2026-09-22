import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { AuditService } from '../../../infrastructure/audit/audit.service';
import { CreateSubscriptionDto, UpdateSubscriptionStatusDto } from './dto/subscription.dto';
import { EntitlementService } from './entitlement.service';
import { SubscriptionStatus } from '@prisma/client';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly entitlementService: EntitlementService
  ) {}

  async getCurrentSubscription(context: TenantContext) {
    const sub = await this.entitlementService.getCurrentSubscription(context.organizationId);
    return sub;
  }

  async getEffectiveEntitlements(context: TenantContext) {
    return this.entitlementService.getEffectiveEntitlements(context.organizationId);
  }

  async create(context: TenantContext, dto: CreateSubscriptionDto) {
    // Validate that dates are coherent
    if (dto.current_period_end && dto.current_period_start) {
      if (new Date(dto.current_period_end) < new Date(dto.current_period_start)) {
        throw new BadRequestException('current_period_end cannot be before current_period_start');
      }
    }

    try {
      const sub = await this.prisma.subscription.create({
        data: {
          organization_id: dto.organization_id, // Explicitly taking from dto for platform admins managing other orgs
          plan_id: dto.plan_id,
          status: dto.status,
          started_at: dto.started_at ? new Date(dto.started_at) : new Date(),
          current_period_start: dto.current_period_start ? new Date(dto.current_period_start) : null,
          current_period_end: dto.current_period_end ? new Date(dto.current_period_end) : null,
          trial_ends_at: dto.trial_ends_at ? new Date(dto.trial_ends_at) : null,
        }
      });

      await this.audit.log(context, 'subscription.create', 'subscription', sub.id, { plan_id: sub.plan_id, status: sub.status });
      return sub;
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('subscriptions_org_active_idx')) {
        throw new ConflictException('Organization already has an active subscription.');
      }
      throw error;
    }
  }

  async updateStatus(context: TenantContext, id: string, dto: UpdateSubscriptionStatusDto) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub || sub.deleted_at) throw new NotFoundException('Subscription not found');

    // Basic transition rules
    const invalidTransitions = {
      'EXPIRED': ['ACTIVE', 'TRIAL', 'SUSPENDED'],
      'CANCELLED': ['ACTIVE', 'TRIAL', 'PAST_DUE'],
    };

    if (invalidTransitions[sub.status] && invalidTransitions[sub.status].includes(dto.status)) {
      throw new BadRequestException(`Cannot transition subscription from ${sub.status} to ${dto.status}`);
    }

    const updates: any = { status: dto.status };
    
    if (dto.status === 'CANCELLED') {
      updates.cancelled_at = new Date();
    } else if (dto.status === 'EXPIRED') {
      updates.ended_at = new Date();
    }

    if (dto.current_period_end) {
      if (sub.current_period_start && new Date(dto.current_period_end) < sub.current_period_start) {
        throw new BadRequestException('current_period_end cannot be before current_period_start');
      }
      updates.current_period_end = new Date(dto.current_period_end);
    }

    try {
      const updated = await this.prisma.subscription.update({
        where: { id },
        data: updates
      });
      await this.audit.log(context, 'subscription.update', 'subscription', id, { from: sub.status, to: updated.status });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('subscriptions_org_active_idx')) {
        throw new ConflictException('Organization already has an active subscription.');
      }
      throw error;
    }
  }
}
