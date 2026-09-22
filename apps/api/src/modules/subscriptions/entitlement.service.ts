import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class EntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the current authoritative active subscription.
   * Logic: Returns the active or trial subscription.
   */
  async getCurrentSubscription(organizationId: string) {
    // Only one active/trial subscription is permitted by DB constraint.
    const sub = await this.prisma.subscription.findFirst({
      where: {
        organization_id: organizationId,
        status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
        deleted_at: null
      },
      include: {
        plan: {
          include: {
            entitlements: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (sub) {
      // Check trial expiration
      if (sub.status === 'TRIAL' && sub.trial_ends_at && new Date() > sub.trial_ends_at) {
        return null; // Trial expired. Lifecycle worker should mark it EXPIRED.
      }
      return sub;
    }

    return null;
  }

  /**
   * Get effective entitlements for an organization.
   * If no subscription is active, fallback to FREE plan if it exists.
   */
  async getEffectiveEntitlements(organizationId: string) {
    const sub = await this.getCurrentSubscription(organizationId);

    if (sub && sub.plan) {
      return sub.plan.entitlements;
    }

    // Default to FREE plan
    const freePlan = await this.prisma.subscriptionPlan.findFirst({
      where: { code: 'FREE', is_active: true, deleted_at: null },
      include: { entitlements: true }
    });

    if (freePlan) {
      return freePlan.entitlements;
    }

    // Hard fallback if FREE doesn't exist
    return [];
  }

  async get(organizationId: string, key: string) {
    const entitlements = await this.getEffectiveEntitlements(organizationId);
    return entitlements.find(e => e.feature_key === key) || null;
  }

  async has(organizationId: string, key: string): Promise<boolean> {
    const ent = await this.get(organizationId, key);
    if (!ent || ent.type !== 'BOOLEAN') return false;
    return ent.value_bool === true;
  }

  async getNumber(organizationId: string, key: string): Promise<number | null> {
    const ent = await this.get(organizationId, key);
    if (!ent || ent.type !== 'INTEGER') return null;
    return ent.value_int !== null ? ent.value_int : null;
  }

  async assertLimit(
    organizationId: string, 
    key: string, 
    currentUsage: number, 
    requestedIncrement: number
  ): Promise<void> {
    const limit = await this.getNumber(organizationId, key);
    if (limit === null) {
      // If the limit doesn't exist, we assume forbidden as a strict default.
      throw new ForbiddenException(`Entitlement limit for ${key} is not granted.`);
    }

    if (currentUsage + requestedIncrement > limit) {
      throw new ForbiddenException(`Exceeded maximum limit for ${key}. Current usage: ${currentUsage}, Limit: ${limit}.`);
    }
  }
}
