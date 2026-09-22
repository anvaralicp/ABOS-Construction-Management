import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, UpdateSubscriptionStatusDto } from './dto/subscription.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @RequirePermissions('subscriptions:read')
  async getCurrentSubscription(@CurrentTenant() context: TenantContext) {
    return this.subscriptionsService.getCurrentSubscription(context);
  }

  @Get('entitlements')
  @RequirePermissions('subscriptions:read')
  async getEffectiveEntitlements(@CurrentTenant() context: TenantContext) {
    return this.subscriptionsService.getEffectiveEntitlements(context);
  }

  // Administrative / System endpoints
  @Post()
  @RequirePermissions('subscriptions:create')
  async create(@CurrentTenant() context: TenantContext, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(context, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('subscriptions:update')
  async updateStatus(@CurrentTenant() context: TenantContext, @Param('id') id: string, @Body() dto: UpdateSubscriptionStatusDto) {
    return this.subscriptionsService.updateStatus(context, id, dto);
  }
}
