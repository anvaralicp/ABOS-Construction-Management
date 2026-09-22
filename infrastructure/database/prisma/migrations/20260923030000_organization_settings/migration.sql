-- CreateEnum
CREATE TYPE "WeekStart" AS ENUM ('MONDAY', 'SUNDAY');

-- AlterTable
ALTER TABLE "organizations" 
ADD COLUMN "legal_name" TEXT,
ADD COLUMN "code" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "website" TEXT;

-- CreateTable
CREATE TABLE "organization_settings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "date_format" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "number_format" TEXT NOT NULL DEFAULT 'IN',
    "week_start" "WeekStart" NOT NULL DEFAULT 'MONDAY',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_settings_organization_id_key" ON "organization_settings"("organization_id");

-- AddForeignKey
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill settings for existing organizations
INSERT INTO "organization_settings" (
    "id", 
    "organization_id", 
    "timezone", 
    "currency", 
    "locale", 
    "date_format", 
    "number_format", 
    "week_start", 
    "version", 
    "created_at", 
    "updated_at"
)
SELECT 
    gen_random_uuid(), 
    "id", 
    'UTC', 
    'INR', 
    'en-IN', 
    'DD/MM/YYYY', 
    'IN', 
    'MONDAY', 
    1, 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
FROM "organizations"
ON CONFLICT ("organization_id") DO NOTHING;
