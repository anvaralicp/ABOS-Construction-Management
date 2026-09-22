import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from './dto/plan.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';

@Controller('subscription-plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @RequirePermissions('subscription_plans:read')
  async findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  @RequirePermissions('subscription_plans:read')
  async findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Post()
  @RequirePermissions('subscription_plans:create')
  async create(@CurrentTenant() context: TenantContext, @Body() dto: CreateSubscriptionPlanDto) {
    return this.plansService.create(context, dto);
  }

  @Patch(':id')
  @RequirePermissions('subscription_plans:update')
  async update(@CurrentTenant() context: TenantContext, @Param('id') id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    return this.plansService.update(context, id, dto);
  }
}
