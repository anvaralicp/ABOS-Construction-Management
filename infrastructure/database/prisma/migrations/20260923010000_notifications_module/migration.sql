-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'BUDGET_ALERT', 'EXPENSE', 'PROJECT', 'PAYMENT', 'DOCUMENT', 'PROGRESS', 'WORKFORCE', 'EQUIPMENT', 'TAX', 'SECURITY');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL');

-- AlterTable
ALTER TABLE "notifications" 
  ADD COLUMN "project_id" UUID,
  ADD COLUMN "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
  ADD COLUMN "is_read" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "expires_at" TIMESTAMP(3),
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "deduplication_key" TEXT;

-- We need to change the "type" column to the enum NotificationType.
-- First cast it to the new enum type.
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType" USING "type"::"NotificationType";

-- CreateIndex
CREATE INDEX "notifications_organization_id_user_id_created_at_idx" ON "notifications"("organization_id", "user_id", "created_at");

-- Create Partial Unique Index for Deduplication
CREATE UNIQUE INDEX "notifications_organization_id_deduplication_key_key" ON "notifications"("organization_id", "deduplication_key") WHERE "deduplication_key" IS NOT NULL;

-- Drop old index
DROP INDEX IF EXISTS "notifications_organization_id_user_id_idx";

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX notifications_organization_id_user_id_is_read_created_at_idx ON notifications(organization_id, user_id, is_read, created_at);
