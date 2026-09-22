import sys
import re

def patch_schema(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Add EntitlementType
    if "enum EntitlementType" not in content:
        old_enum = """enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
}"""
        new_enum = """enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  TRIAL
  SUSPENDED
  CANCELLED
  EXPIRED
}

enum EntitlementType {
  BOOLEAN
  INTEGER
}"""
        content = content.replace(old_enum, new_enum)

    # Update SubscriptionPlan
    old_plan = """model SubscriptionPlan {
  id            String   @id @default(uuid()) @db.Uuid
  name          String
  price         Int
  currency      String
  billing_cycle String
  
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  entitlements  Entitlement[]
  subscriptions Subscription[]

  @@map("subscription_plans")
}"""
    new_plan = """model SubscriptionPlan {
  id            String   @id @default(uuid()) @db.Uuid
  code          String   @unique
  name          String
  description   String?
  price         Int
  currency      String
  billing_cycle String
  is_active     Boolean  @default(true)
  sort_order    Int      @default(0)
  
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  deleted_at DateTime?

  entitlements  Entitlement[]
  subscriptions Subscription[]

  @@index([code, is_active])
  @@map("subscription_plans")
}"""
    if 'code          String   @unique' not in content:
        content = content.replace(old_plan, new_plan)

    # Update Subscription
    old_sub = """model Subscription {
  id                 String             @id @default(uuid()) @db.Uuid
  organization_id    String             @db.Uuid
  plan_id            String             @db.Uuid
  status             SubscriptionStatus
  current_period_end DateTime
  
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  organization Organization     @relation(fields: [organization_id], references: [id], onDelete: Restrict)
  plan         SubscriptionPlan @relation(fields: [plan_id], references: [id], onDelete: Restrict)

  @@map("subscriptions")
}"""
    new_sub = """model Subscription {
  id                 String             @id @default(uuid()) @db.Uuid
  organization_id    String             @db.Uuid
  plan_id            String             @db.Uuid
  status             SubscriptionStatus
  
  started_at           DateTime?
  current_period_start DateTime?
  current_period_end   DateTime?
  trial_ends_at        DateTime?
  cancelled_at         DateTime?
  ended_at             DateTime?
  
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  deleted_at DateTime?

  organization Organization     @relation(fields: [organization_id], references: [id], onDelete: Restrict)
  plan         SubscriptionPlan @relation(fields: [plan_id], references: [id], onDelete: Restrict)

  @@index([organization_id, status])
  @@index([organization_id, current_period_end])
  @@map("subscriptions")
}"""
    if 'started_at           DateTime?' not in content:
        content = content.replace(old_sub, new_sub)

    # Update Entitlement
    old_ent = """model Entitlement {
  id          String @id @default(uuid()) @db.Uuid
  plan_id     String @db.Uuid
  feature_key String
  limit_value Int
  
  plan SubscriptionPlan @relation(fields: [plan_id], references: [id], onDelete: Restrict)

  @@map("entitlements")
}"""
    new_ent = """model Entitlement {
  id          String @id @default(uuid()) @db.Uuid
  plan_id     String @db.Uuid
  feature_key String
  type        EntitlementType
  value_int   Int?
  value_bool  Boolean?
  
  plan SubscriptionPlan @relation(fields: [plan_id], references: [id], onDelete: Restrict)

  @@unique([plan_id, feature_key])
  @@map("entitlements")
}"""
    if 'type        EntitlementType' not in content:
        content = content.replace(old_ent, new_ent)

    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_schema(sys.argv[1])
