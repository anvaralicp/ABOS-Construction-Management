import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { EntitlementService } from './entitlement.service';

@Module({
  controllers: [SubscriptionsController, PlansController],
  providers: [SubscriptionsService, PlansService, EntitlementService],
  exports: [EntitlementService]
})
export class SubscriptionsModule {}
