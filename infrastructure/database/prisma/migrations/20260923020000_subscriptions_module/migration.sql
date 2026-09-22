-- CreateEnum
CREATE TYPE "EntitlementType" AS ENUM ('BOOLEAN', 'INTEGER');

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRIAL';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'CANCELLED';

-- AlterTable SubscriptionPlan
ALTER TABLE "subscription_plans" ADD COLUMN "code" TEXT;
-- Set existing rows to have a code (if any)
UPDATE "subscription_plans" SET "code" = "id" WHERE "code" IS NULL;
ALTER TABLE "subscription_plans" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "subscription_plans" ADD COLUMN "description" TEXT;
ALTER TABLE "subscription_plans" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "subscription_plans" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "subscription_plans" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex on SubscriptionPlan
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");
CREATE INDEX "subscription_plans_code_is_active_idx" ON "subscription_plans"("code", "is_active");

-- AlterTable Subscription
ALTER TABLE "subscriptions" ADD COLUMN "started_at" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN "current_period_start" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN "trial_ends_at" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN "cancelled_at" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN "ended_at" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex on Subscription
CREATE INDEX "subscriptions_organization_id_status_idx" ON "subscriptions"("organization_id", "status");
CREATE INDEX "subscriptions_organization_id_current_period_end_idx" ON "subscriptions"("organization_id", "current_period_end");

-- Create Partial Unique Index for Active Subscriptions
CREATE UNIQUE INDEX "subscriptions_org_active_idx" ON "subscriptions"("organization_id") WHERE "status" IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED');

-- AlterTable Entitlement
ALTER TABLE "entitlements" RENAME COLUMN "limit_value" TO "value_int";
ALTER TABLE "entitlements" ALTER COLUMN "value_int" DROP NOT NULL;
ALTER TABLE "entitlements" ADD COLUMN "type" "EntitlementType";
-- Set default type for existing rows
UPDATE "entitlements" SET "type" = 'INTEGER' WHERE "type" IS NULL;
ALTER TABLE "entitlements" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "entitlements" ADD COLUMN "value_bool" BOOLEAN;

-- CreateIndex on Entitlement
CREATE UNIQUE INDEX "entitlements_plan_id_feature_key_key" ON "entitlements"("plan_id", "feature_key");
