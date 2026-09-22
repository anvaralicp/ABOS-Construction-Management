import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { AuditService } from '../../../infrastructure/audit/audit.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from './dto/plan.dto';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async findAll() {
    return this.prisma.subscriptionPlan.findMany({
      where: { deleted_at: null },
      include: { entitlements: true },
      orderBy: { sort_order: 'asc' }
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id, deleted_at: null },
      include: { entitlements: true }
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async create(context: TenantContext, dto: CreateSubscriptionPlanDto) {
    // Validate that there are no duplicate entitlement keys within the dto payload
    if (dto.entitlements) {
      const keys = dto.entitlements.map(e => e.feature_key);
      if (new Set(keys).size !== keys.length) {
        throw new ConflictException('Duplicate entitlement keys found in payload');
      }
    }

    try {
      const plan = await this.prisma.subscriptionPlan.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description || null,
          price: dto.price,
          currency: dto.currency,
          billing_cycle: dto.billing_cycle,
          is_active: dto.is_active !== undefined ? dto.is_active : true,
          sort_order: dto.sort_order || 0,
          entitlements: dto.entitlements ? {
            create: dto.entitlements.map(e => ({
              feature_key: e.feature_key,
              type: e.type,
              value_int: e.value_int !== undefined ? e.value_int : null,
              value_bool: e.value_bool !== undefined ? e.value_bool : null
            }))
          } : undefined
        },
        include: { entitlements: true }
      });
      await this.audit.log(context, 'subscription_plan.create', 'subscription_plan', plan.id, { code: plan.code });
      return plan;
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('code')) {
        throw new ConflictException('Plan code already exists');
      }
      throw error;
    }
  }

  async update(context: TenantContext, id: string, dto: UpdateSubscriptionPlanDto) {
    const plan = await this.findOne(id);
    const updated = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        currency: dto.currency,
        billing_cycle: dto.billing_cycle,
        is_active: dto.is_active,
        sort_order: dto.sort_order
      },
      include: { entitlements: true }
    });
    await this.audit.log(context, 'subscription_plan.update', 'subscription_plan', id, { code: plan.code });
    return updated;
  }
}
